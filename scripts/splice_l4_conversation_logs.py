#!/usr/bin/env python3
"""Splice per-reply trace mock data for Leasing / Payments / Maintenance into agent-roster page.tsx."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "app" / "agent-roster" / "page.tsx"
FRAG = Path(__file__).with_name("l4_logs_replacement.fragment.txt")

def main() -> None:
    text = PAGE.read_text(encoding="utf-8")
    start = text.index('  if (agentName === "Leasing AI") return [')
    end = text.index('  if (agentName === "Renewal AI") return [')
    frag = FRAG.read_text(encoding="utf-8")
    if not frag.endswith("\n"):
        frag += "\n"
    PAGE.write_text(text[:start] + frag + text[end:], encoding="utf-8")
    print("OK: spliced", FRAG.name, "into", PAGE.relative_to(ROOT))


if __name__ == "__main__":
    main()
