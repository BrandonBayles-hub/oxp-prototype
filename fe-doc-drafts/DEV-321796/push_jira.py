#!/usr/bin/env python3
"""Push DEV-321796 FE Doc fields + concise description via Jira REST API."""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path.home() / ".codex/skills/fe-doc-from-ticket/tools"))
from fe_doc_markdown_to_jira_fields import build_fields  # type: ignore

ISSUE = "DEV-321796"
MD = Path(__file__).resolve().parent / "feature-essentials.md"


def adf_doc(paragraphs: list[str]) -> dict:
    content = []
    for p in paragraphs:
        if p.startswith("## "):
            content.append(
                {
                    "type": "heading",
                    "attrs": {"level": 2},
                    "content": [{"type": "text", "text": p[3:]}],
                }
            )
        elif p.startswith("- "):
            # flush later; handled below
            content.append(p)
        else:
            content.append(
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": p}],
                }
            )
    # Convert any leftover "- " strings into one bullet list
    out = []
    bullets = []
    for node in content:
        if isinstance(node, str) and node.startswith("- "):
            bullets.append(node[2:])
            continue
        if bullets:
            out.append(
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": b}],
                                }
                            ],
                        }
                        for b in bullets
                    ],
                }
            )
            bullets = []
        out.append(node)
    if bullets:
        out.append(
            {
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": b}],
                            }
                        ],
                    }
                    for b in bullets
                ],
            }
        )
    return {"type": "doc", "version": 1, "content": out}


DESCRIPTION = adf_doc(
    [
        "Staff can read and reply to resident or lead messages in another language without leaving Communications.",
        "When a conversation is in a language other than English, a Translate button appears in the conversation header. One click shows the whole thread in English. Click Show original to return to the language that was actually sent.",
        "Each translated message is labeled so staff can tell whether they are looking at a translation, the original, or the English they typed.",
        "Staff type replies in English. Communications can send the reply in the other person's language and show a short preview before send. Staff can turn that off and send English instead.",
        "Email signatures stay on email only. Text and voice conversations do not get a signature.",
        "If the conversation is already in English, Translate does not appear.",
        "## Who this is for",
        "- Leasing and resident services staff who answer Email, SMS, or Voice in Communications",
        "- Supervisors who review what was sent versus what the resident wrote",
        "## Out of scope for this release",
        "- Live phone-call interpretation",
        "- Translating private notes",
        "- A resident-facing language toggle",
    ]
)


def put(fields: dict) -> dict:
    host = os.environ["JIRA_HOST"].replace("https://", "").rstrip("/")
    email = os.environ["JIRA_EMAIL"]
    token = os.environ["JIRA_API_TOKEN"]
    url = f"https://{host}/rest/api/3/issue/{ISSUE}"
    body = json.dumps({"fields": fields}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="PUT",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    import base64

    req.add_header(
        "Authorization",
        "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode(),
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return {"status": resp.status, "body": raw.decode() if raw else ""}
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print("PUT failed", e.code, err[:4000], file=sys.stderr)
        raise


def main() -> None:
    fields = build_fields(MD, total_score=87)
    # Override selects to match the FE Doc body (multi-value where needed).
    fields["customfield_10226"] = {"id": "10329"}  # In Progress — predicted 87, no screenshots
    fields["customfield_11003"] = {"id": "14311"}  # Phased Rapid Release = Yes
    fields["customfield_11015"] = {"id": "14334"}  # Required at GA
    fields["customfield_11301"] = {"id": "14876"}  # Customer facing release note = Yes
    fields["customfield_10434"] = [{"id": "14903"}]  # Company Feature Flag
    fields["customfield_11299"] = [
        {"id": "14858"},  # Leasing
        {"id": "14860"},  # Resident Management
        {"id": "14862"},  # Maintenance
    ]
    fields["customfield_11300"] = [
        {"id": "14866"},  # Leasing
        {"id": "14872"},  # Renewal/transfer
    ]

    print("Push 1: FE Doc fields + metadata")
    r1 = put(fields)
    print("  status", r1["status"])

    print("Push 2: concise non-technical description")
    r2 = put({"description": DESCRIPTION})
    print("  status", r2["status"])


if __name__ == "__main__":
    main()
