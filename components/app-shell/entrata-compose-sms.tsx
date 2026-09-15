"use client";

/**
 * @deprecated LEGACY — no longer rendered anywhere.
 *
 * Superseded by `components/app-shell/entrata-inline-sms-composer.tsx`,
 * which repurposes this modal's guts (profile card + textarea + Send
 * SMS logic) as a flat panel that fills the OXP `/conversations/`
 * right pane instead of floating over the app. Kept on disk in case
 * the modal decision is reversed; see EntrataTopNav for the current
 * wiring (`pendingSmsCompose` handoff → inline composer).
 *
 * Original doc:
 * Compose-SMS popup.
 *
 * Opened from the SMS button on a resident/lead row in the
 * `EntrataGlobalSearch` overlay **when that row has no active SMS
 * thread**. Shows the person's profile card at the top and an SMS
 * compose form below. Sending creates a new conversation via
 * `useConversations().addConversation(...)` and navigates the user
 * into the newly-created thread on the OXP Conversations page — so
 * a conversation is only committed to state once the user actually
 * hits Send, matching the requirement that "it shouldn't start a
 * conversation until the message is sent."
 *
 * If the user cancels or presses Escape, nothing is written to state
 * and the popup closes cleanly.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Send, Phone, Building2, Home, User as UserIcon, MessageSquare } from "lucide-react";
import { useConversations } from "@/lib/conversations-context";
import type { Result } from "@/components/app-shell/entrata-global-search";

/** Deterministic demo values shown in the profile card. A real
 *  Entrata build would fetch these from the resident record. */
const DEMO_LEASE_START = "05/09/2026";
const DEMO_LEASE_END = "05/08/2027";

const MAX_SMS_LENGTH = 160;

export function EntrataComposeSms({
  open,
  onClose,
  recipient,
}: {
  open: boolean;
  onClose: () => void;
  recipient: Result | null;
}) {
  const router = useRouter();
  const { addConversation } = useConversations();
  const [body, setBody] = useState("");

  // Reset the textarea every time the modal reopens with a new
  // recipient so an abandoned draft doesn't leak across sessions.
  useEffect(() => {
    if (!open) return;
    setBody("");
  }, [open, recipient?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /**
   * Prefer the row's real `phone`. If a row doesn't have one we still
   * want the demo compose flow to be usable, so we synthesize a
   * deterministic 555-prefixed number seeded by the row id. That
   * keeps the "no phone" edge state out of the primary happy path
   * while still letting real data override the fallback.
   */
  const phoneDisplay = useMemo(() => {
    if (recipient?.phone) return recipient.phone;
    if (!recipient) return "(555) 000-0000";
    // Simple string-hash seeded on the row id so each row gets a
    // stable but distinct number instead of every fallback showing
    // the same digits.
    let hash = 0;
    for (let i = 0; i < recipient.id.length; i += 1) {
      hash = (hash * 31 + recipient.id.charCodeAt(i)) & 0xffffff;
    }
    const area = 720;
    const prefix = 555;
    const line = 1000 + (hash % 8999);
    return `(${area}) ${prefix}-${String(line).padStart(4, "0")}`;
  }, [recipient]);

  if (!open || !recipient) return null;

  const trimmedBody = body.trim();
  const canSend = trimmedBody.length > 0;

  const handleSend = () => {
    if (!canSend) return;
    // Commit a new SMS thread to the conversations context. This is
    // the ONLY place we mutate global state — until this handler
    // runs, no conversation exists for this person, which is the
    // "don't start until the message is sent" invariant.
    const newId = addConversation({
      resident: recipient.name,
      unit: recipient.bldgUnit === "-" ? null : recipient.bldgUnit,
      preview: trimmedBody,
      agent: "None",
      time: "just now",
      contactType: recipient.type === "Resident" ? "Resident" : "Lead",
      property: recipient.property,
      channel: "SMS",
      assignee: "Abe Kashiwagi",
      labels: [recipient.type === "Resident" ? "Resident" : "Lead"],
      status: "open",
      hasUnread: false,
      messages: [
        {
          role: "staff",
          text: trimmedBody,
          timestamp: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }) + " MST",
          type: "message",
        },
      ],
    });
    onClose();
    router.push(`/conversations/?id=${newId}`);
  };

  return (
    <div
      role="dialog"
      aria-label={`Send SMS to ${recipient.name}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          maxHeight: "min(720px, calc(100vh - 48px))",
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 24px 48px rgba(0,0,0,0.24), 0 8px 16px rgba(0,0,0,0.12)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
              }}
            >
              <MessageSquare style={{ width: 14, height: 14 }} strokeWidth={2} />
            </span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
              Send SMS to {recipient.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: "rgba(0,0,0,0.55)",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={2} />
          </button>
        </div>

        {/* Profile card */}
        <div
          style={{
            padding: "14px 16px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: 12,
            rowGap: 8,
            background: "#F8FAFC",
            borderBottom: "1px solid #E5E7EB",
            fontSize: 12.5,
            color: "#0f172a",
          }}
        >
          <ProfileRow icon={<UserIcon style={{ width: 14, height: 14 }} strokeWidth={2} />} label="Name">
            <span style={{ fontWeight: 600 }}>{recipient.name}</span>{" "}
            <span style={{ color: "rgba(0,0,0,0.5)" }}>· {recipient.role} · {recipient.type}</span>
          </ProfileRow>
          <ProfileRow icon={<Building2 style={{ width: 14, height: 14 }} strokeWidth={2} />} label="Property">
            {recipient.property}
          </ProfileRow>
          {recipient.bldgUnit && recipient.bldgUnit !== "-" && (
            <ProfileRow icon={<Home style={{ width: 14, height: 14 }} strokeWidth={2} />} label="Unit">
              {recipient.bldgUnit}
            </ProfileRow>
          )}
          <ProfileRow icon={<Phone style={{ width: 14, height: 14 }} strokeWidth={2} />} label="Phone">
            <span style={{ fontFamily: "SF Mono, ui-monospace, monospace" }}>{phoneDisplay}</span>
          </ProfileRow>
          {recipient.type === "Resident" && (
            <ProfileRow icon={null} label="Lease">
              <span style={{ color: "rgba(0,0,0,0.65)" }}>
                {DEMO_LEASE_START} – {DEMO_LEASE_END}
              </span>
            </ProfileRow>
          )}
        </div>

        {/* Compose area */}
        <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label
              htmlFor="sms-body"
              style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}
            >
              Message
            </label>
            <span
              style={{
                fontSize: 11,
                color:
                  body.length > MAX_SMS_LENGTH ? "#DC2626" : "rgba(0,0,0,0.5)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {body.length}/{MAX_SMS_LENGTH}
            </span>
          </div>
          <textarea
            id="sms-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Write an SMS to ${recipient.name.split(",")[0]}…`}
            rows={6}
            style={{
              marginTop: 6,
              width: "100%",
              border: "1px solid #CBD5E1",
              borderRadius: 6,
              padding: "10px 12px",
              fontFamily: "inherit",
              fontSize: 13,
              color: "#0f172a",
              resize: "vertical",
              outline: "none",
              minHeight: 100,
              background: "#fff",
            }}
          />
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              fontSize: 11.5,
              color: "rgba(0,0,0,0.55)",
              lineHeight: 1.5,
            }}
          >
            Hitting <span style={{ fontWeight: 600, color: "#0f172a" }}>Send SMS</span>{" "}
            starts a new conversation in OXP Communications — nothing
            is saved until you send.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 16px",
            borderTop: "1px solid #E5E7EB",
            background: "#fff",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 32,
              padding: "0 14px",
              border: "1px solid #CBD5E1",
              borderRadius: 6,
              background: "#fff",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 14px",
              border: "1px solid #0f172a",
              borderRadius: 6,
              background: canSend ? "#0f172a" : "#94A3B8",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: canSend ? "pointer" : "not-allowed",
              opacity: canSend ? 1 : 0.9,
            }}
          >
            <Send style={{ width: 13, height: 13 }} strokeWidth={2} />
            Send SMS
          </button>
        </div>
      </div>
    </div>
  );
}

/** One row in the profile card. Icon (or blank slot) + label +
 *  value on a shared 2-column grid so labels line up cleanly. */
function ProfileRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode | null;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "rgba(0,0,0,0.55)",
        }}
      >
        <span style={{ width: 14, height: 14, display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
          {icon}
        </span>
        <span style={{ fontWeight: 600, color: "#0f172a" }}>{label}</span>
      </div>
      <div>{children}</div>
    </>
  );
}
