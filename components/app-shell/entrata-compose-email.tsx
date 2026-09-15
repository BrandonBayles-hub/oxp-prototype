"use client";

/**
 * Entrata Compose Email modal.
 *
 * Opened from the Email button on any resident/lead row in the
 * `EntrataGlobalSearch` overlay. Matches the classic Entrata "Create
 * Email" experience from the reference the PM shared — dark top bar
 * with breadcrumb, two-column body (form on the left, resident info
 * sidebar on the right), design/template toggle strip, rich-text
 * toolbar, and Send/Save actions in the footer.
 *
 * This is a design-fidelity prototype — the rich-text editor is a
 * plain textarea styled to look like Entrata's WYSIWYG, and none of
 * the toolbar buttons actually mutate the body. Sending closes the
 * modal and shows a toast-style confirmation via `onSend`.
 */

import { useEffect, useState } from "react";
import {
  X,
  ChevronDown,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Undo2,
  Redo2,
  Eye,
  Palette,
  Highlighter,
  Code,
  Image as ImageIcon,
  Bell,
  ChevronRight,
  Columns2,
} from "lucide-react";
import type { Result } from "@/components/app-shell/entrata-global-search";

const ENTRATA_BLUE = "#2A6EBB";
const ENTRATA_ORANGE = "#F58A3F";

/** Deterministic demo values that a real Entrata build would fetch
 *  from the resident record. Kept as constants so the sidebar looks
 *  populated without needing a real backend. */
const DEMO_LEASE_START = "05/09/2026";
const DEMO_LEASE_END = "05/08/2027";

export function EntrataComposeEmail({
  open,
  onClose,
  recipient,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  /** The row that was clicked in the search overlay. Used to populate
   *  Recipients + the Resident Info sidebar. */
  recipient: Result | null;
  /** Called when the user hits Send. The parent typically closes the
   *  modal and shows a confirmation. */
  onSend?: (r: Result, payload: { subject: string; body: string }) => void;
}) {
  const [fromMode, setFromMode] = useState<"default" | "custom" | "relay">(
    "relay",
  );
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bcc, setBcc] = useState("");
  const [body, setBody] = useState("");
  const [designMode, setDesignMode] = useState<"new" | "template">("new");

  // Reset all form fields every time the modal reopens with a new
  // recipient so the previous draft doesn't leak between sessions.
  useEffect(() => {
    if (!open) return;
    setFromMode("relay");
    setSubject("");
    setPreheader("");
    setBcc("");
    setBody("");
    setDesignMode("new");
  }, [open, recipient?.id]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !recipient) return null;

  const emailAddress =
    recipient.email ??
    recipient.otherResults.find((o) => (o.label ?? "").toLowerCase() === "email")
      ?.value ??
    "no-email-on-file@entrata.demo";

  const residencyStatus = recipient.type === "Resident" ? "Current" : recipient.status;

  return (
    <div
      role="dialog"
      aria-label="Compose email"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "#F5F5F5",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#1a1a1a",
      }}
    >
      {/* Dark top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 32,
          padding: "0 8px 0 14px",
          background: "#2E2E2E",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Real bold red wordmark — no SVG hack so it renders crisp
              at every zoom level. */}
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#CC0000",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            entrata
          </span>
          <ChevronRight
            style={{ width: 12, height: 12, color: "rgba(255,255,255,0.55)" }}
            strokeWidth={2}
          />
          <span style={{ fontSize: 12.5, fontWeight: 400, color: "rgba(255,255,255,0.95)" }}>
            Create Email
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            aria-label="Help"
            style={{
              width: 22,
              height: 22,
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 2,
              background: "transparent",
              color: "rgba(255,255,255,0.95)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ?
          </button>
          <button
            type="button"
            aria-label="Notifications"
            style={{
              width: 26,
              height: 22,
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.95)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell style={{ width: 14, height: 14 }} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 26,
              padding: "0 8px",
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 400,
            }}
          >
            <X style={{ width: 14, height: 14 }} strokeWidth={2} />
            Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 28px" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: "-0.01em", color: "#1a1a1a" }}>
          Compose Your Message
        </h1>

        {/* Three-column form area — matches the reference:
            left = sender/metadata, middle = Recipients,
            right = Resident Info card.
            Column widths were bumped from 260/260/300 → 300/220/340 so
            the "From Address" segmented control fits its labels on one
            line and the Resident Info values (Property = "Courthouse
            Square Apartments") have room to breathe. */}
        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "300px 220px 340px",
            columnGap: 40,
            rowGap: 16,
            alignItems: "start",
          }}
        >
          {/* Column 1 — sender / metadata (spans multiple rows) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <FieldLabel required>From Address</FieldLabel>
              <SegmentedGroup>
                <SegmentedItem
                  selected={fromMode === "default"}
                  onClick={() => setFromMode("default")}
                >
                  Default Addresses
                </SegmentedItem>
                <SegmentedItem
                  selected={fromMode === "custom"}
                  onClick={() => setFromMode("custom")}
                >
                  Custom Address
                </SegmentedItem>
                <SegmentedItem
                  selected={fromMode === "relay"}
                  onClick={() => setFromMode("relay")}
                  accent
                  last
                >
                  Email Relay
                </SegmentedItem>
              </SegmentedGroup>
            </div>

            <div>
              <FieldLabel>BCC</FieldLabel>
              <TextInput
                value={bcc}
                onChange={setBcc}
                placeholder="Enter Email Address"
                trailingIcon
              />
              {/* Tiny help/attach glyph shown under the BCC field in the ref.
                  A little top margin so it doesn't bump into the input. */}
              <div
                style={{
                  marginTop: 8,
                  width: 18,
                  height: 18,
                  border: "1px solid #C4C4C4",
                  borderRadius: 2,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ENTRATA_BLUE,
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
                aria-hidden
              >
                ?
              </div>
            </div>

            <div>
              <FieldLabel required>Subject</FieldLabel>
              <TextInput
                value={subject}
                onChange={setSubject}
                placeholder=""
                trailingIcon
              />
            </div>

            <div>
              <FieldLabel>Preheader</FieldLabel>
              <textarea
                value={preheader}
                onChange={(e) => setPreheader(e.target.value.slice(0, 250))}
                rows={2}
                style={{
                  width: "100%",
                  border: "1px solid #C4C4C4",
                  borderRadius: 2,
                  padding: "6px 8px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  color: "#1a1a1a",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(0,0,0,0.5)" }}>
                {250 - preheader.length}
              </div>
            </div>
          </div>

          {/* Column 2 — Recipients */}
          <div>
            <FieldLabel required>Recipients</FieldLabel>
            <div
              style={{
                border: "1px solid #C4C4C4",
                borderRadius: 2,
                padding: "5px 8px",
                minHeight: 30,
                fontSize: 12,
                lineHeight: 1.4,
                color: "#1a1a1a",
                background: "#fff",
                boxSizing: "border-box",
                wordBreak: "break-word",
              }}
            >
              {recipient.name}{" "}
              <span style={{ color: "rgba(0,0,0,0.75)", fontWeight: 600 }}>
                &lt;{emailAddress}&gt;
              </span>{" "}
              {recipient.role} ({residencyStatus})
            </div>
          </div>

          {/* Column 3 — Resident Info card */}
          <div
            style={{
              background: "#EDEDED",
              border: "1px solid #D9D9D9",
              padding: "16px 20px 18px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#333" }}>Resident Info</h3>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                columnGap: 20,
                rowGap: 6,
                fontSize: 12.5,
                lineHeight: 1.35,
                color: "#1a1a1a",
              }}
            >
              <span style={{ fontWeight: 700 }}>Resident Name</span>
              <span>{recipient.name}</span>
              <span style={{ fontWeight: 700 }}>Unit</span>
              <span>{recipient.bldgUnit}</span>
              <span style={{ fontWeight: 700 }}>Property</span>
              <span>{recipient.property}</span>
              <span style={{ fontWeight: 700 }}>Current Balance:</span>
              <span>$0.00</span>
              <span style={{ fontWeight: 700 }}>Lease Status</span>
              <span>{residencyStatus} -</span>
              <span style={{ fontWeight: 700 }}>Move-In Date</span>
              <span>{DEMO_LEASE_START}</span>
              <span style={{ fontWeight: 700 }}>Lease End</span>
              <span>{DEMO_LEASE_END}</span>
            </div>
            <button
              type="button"
              style={{
                marginTop: 14,
                background: "transparent",
                border: "none",
                padding: 0,
                color: ENTRATA_BLUE,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 400,
              }}
            >
              See Message History
            </button>
          </div>
        </div>

        {/* Design / template toggle */}
        <div style={{ marginTop: 28, borderTop: "1px solid #E0E0E0", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <SegmentedGroup>
              <SegmentedItem
                selected={designMode === "new"}
                onClick={() => setDesignMode("new")}
                accent
              >
                Create New Design
              </SegmentedItem>
              <SegmentedItem
                selected={designMode === "template"}
                onClick={() => setDesignMode("template")}
                last
              >
                Use Template
              </SegmentedItem>
            </SegmentedGroup>

            <button
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 10px",
                border: "1px solid #C4C4C4",
                borderRadius: 2,
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
                color: "#1a1a1a",
              }}
            >
              <Columns2 style={{ width: 12, height: 12, color: "#4a4a4a" }} strokeWidth={1.75} />
              Change Layout
            </button>
            <span style={{ fontSize: 12.5, color: "#1a1a1a" }}>
              <span style={{ fontWeight: 700 }}>Layout:</span> Custom
            </span>
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: 40 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>Message</h4>

              {/* Rich text toolbar — CKEditor-style. Wraps naturally
                  onto multiple rows at narrow widths. */}
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid #B5B5B5",
                  borderBottom: "none",
                  borderRadius: "2px 2px 0 0",
                  background: "#EDEDED",
                  padding: "6px 6px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  rowGap: 8,
                  alignItems: "center",
                }}
              >
                <ToolbarBtn>
                  <Code style={{ width: 12, height: 12 }} /> Source
                </ToolbarBtn>
                <ToolbarBtn>
                  <ImageIcon style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Undo2 style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Redo2 style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarDropdown label="Font" />
                <ToolbarDropdown label="Size" />
                <ToolbarBtn>
                  <Bold style={{ width: 12, height: 12 }} strokeWidth={3} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Italic style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Underline style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Strikethrough style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Palette style={{ width: 12, height: 12 }} />
                  <ChevronDown style={{ width: 8, height: 8 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Highlighter style={{ width: 12, height: 12 }} />
                  <ChevronDown style={{ width: 8, height: 8 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <LinkIcon style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <ListOrdered style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <List style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Outdent style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <Indent style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <AlignLeft style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <AlignCenter style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <AlignRight style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>
                  <AlignJustify style={{ width: 12, height: 12 }} />
                </ToolbarBtn>
                <ToolbarBtn>Merge Fields</ToolbarBtn>
                <ToolbarDropdown label="Social Media" />
                <ToolbarBtn>Add To Calendar</ToolbarBtn>
                <ToolbarDropdown label="BgColor" />
              </div>

              {/* Editor — a plain textarea styled as the CKEditor
                  body. Grows to fill the remaining vertical space. */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder=""
                rows={12}
                style={{
                  width: "100%",
                  display: "block",
                  marginTop: 0,
                  border: "1px solid #B5B5B5",
                  borderRadius: "0 0 2px 2px",
                  padding: "12px 14px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  color: "#1a1a1a",
                  resize: "vertical",
                  outline: "none",
                  background: "#fff",
                  minHeight: 220,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Right sidebar options for the Message section. Mirrors
                the reference layout: heading + None dropdown, then
                Add Attachments, then Attached Files heading, then
                Preview Email. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 22 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: "#1a1a1a" }}>
                  Email Header / Footer Options
                </div>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    height: 28,
                    padding: "0 8px",
                    border: "1px solid #C4C4C4",
                    borderRadius: 2,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                    color: "#1a1a1a",
                    cursor: "pointer",
                  }}
                >
                  None
                  <ChevronDown style={{ width: 12, height: 12, color: "rgba(0,0,0,0.5)" }} strokeWidth={2} />
                </button>
              </div>
              <div>
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 26,
                    padding: "0 10px",
                    border: "1px solid #C4C4C4",
                    borderRadius: 2,
                    background: "#fff",
                    fontSize: 12,
                    color: "#1a1a1a",
                    cursor: "pointer",
                  }}
                >
                  <Paperclip style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                  Add Attachments
                </button>
                <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: "#1a1a1a" }}>
                  Attached Files
                </div>
              </div>

              <div>
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 26,
                    padding: "0 10px",
                    border: "1px solid #C4C4C4",
                    borderRadius: 2,
                    background: "#fff",
                    fontSize: 12,
                    color: "#1a1a1a",
                    cursor: "pointer",
                  }}
                >
                  <Eye style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                  Preview Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — Send / Cancel */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          padding: "12px 32px",
          background: "#FFFFFF",
          borderTop: "1px solid #E5E5E5",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            height: 32,
            padding: "0 16px",
            border: "1px solid #C4C4C4",
            borderRadius: 3,
            background: "#fff",
            color: "#1a1a1a",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onSend?.(recipient, { subject, body });
            onClose();
          }}
          style={{
            height: 32,
            padding: "0 18px",
            border: "1px solid " + ENTRATA_ORANGE,
            borderRadius: 3,
            background: ENTRATA_ORANGE,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Send Email
        </button>
      </div>
    </div>
  );
}

/** Small "* Label" that's used for every field in the form. When
 *  `required` is true a red asterisk is prepended, matching the
 *  Entrata reference. */
function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12.5,
        fontWeight: 600,
        marginBottom: 4,
        color: "#1a1a1a",
      }}
    >
      {required && (
        <span style={{ color: "#CC0000", marginRight: 2 }}>*</span>
      )}
      {children}
    </label>
  );
}

/** Container for the button-group segments used both in the "From
 *  Address" toggle and the "Create New Design / Use Template" strip.
 *  Just an inline-flex with visible dividers between segments — the
 *  outer border is drawn once around the whole group so the segments
 *  read as one cohesive control (matches the Entrata reference). */
function SegmentedGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: 2,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {children}
    </div>
  );
}

function SegmentedItem({
  children,
  selected,
  onClick,
  accent,
  last,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  /** When true the active state uses the orange Entrata accent
   *  instead of the muted gray fill. Reserved for the "Email Relay"
   *  / "Create New Design" segments in the reference. */
  accent?: boolean;
  /** Set on the last segment so we don't render the right divider on
   *  it — the group border handles that edge. */
  last?: boolean;
}) {
  const activeBg = accent ? "#FBE4C6" : "#F0F0F0";
  const activeColor = accent ? "#C25000" : "#1a1a1a";
  const activeBorder = accent ? "#E9A25A" : "#B5B5B5";
  const idleBorder = "#C4C4C4";
  const borderColor = selected ? activeBorder : idleBorder;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        // Height + padding bumped so labels like "Default Addresses"
        // fit on ONE line with comfortable side padding. `whiteSpace:
        // nowrap` is the key fix — without it the segments collapse
        // vertically to fit and each label wraps to two lines.
        height: 28,
        padding: "0 10px",
        border: `1px solid ${borderColor}`,
        borderRight: last ? `1px solid ${borderColor}` : "none",
        background: selected ? activeBg : "#fff",
        color: selected ? activeColor : "#1a1a1a",
        fontSize: 12,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/** Basic single-line text input styled to match Entrata's classic
 *  form field. `trailingIcon` shows the little "merge fields" icon
 *  on the right so the input looks wired-up like the reference. */
function TextInput({
  value,
  onChange,
  placeholder,
  trailingIcon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  trailingIcon?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 30,
          border: "1px solid #C4C4C4",
          borderRadius: 3,
          // Widened right padding + glyph pulled off the edge (from
          // right:6 → right:10) so the ⌇ merge-fields marker breathes.
          padding: "0 34px 0 8px",
          fontFamily: "inherit",
          fontSize: 13,
          color: "#1a1a1a",
          outline: "none",
          background: "#fff",
        }}
      />
      {trailingIcon && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(0,0,0,0.35)",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          ⌇
        </span>
      )}
    </div>
  );
}

/** Small square toolbar button used in the rich-text toolbar. Not
 *  wired to the editor — visual only. Matches the classic CKEditor
 *  chiclet: pale gray fill, thin gray border, tiny icon inside. */
function ToolbarBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        height: 22,
        padding: "0 5px",
        border: "1px solid #B5B5B5",
        borderRadius: 2,
        background:
          "linear-gradient(to bottom, #FFFFFF 0%, #F2F2F2 100%)",
        color: "#1a1a1a",
        fontSize: 11.5,
        cursor: "pointer",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          "linear-gradient(to bottom, #FFFFFF 0%, #E5E5E5 100%)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background =
          "linear-gradient(to bottom, #FFFFFF 0%, #F2F2F2 100%)";
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDropdown({ label }: { label: string }) {
  return (
    <button
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 22,
        padding: "0 6px 0 8px",
        border: "1px solid #B5B5B5",
        borderRadius: 2,
        background:
          "linear-gradient(to bottom, #FFFFFF 0%, #F2F2F2 100%)",
        color: "#1a1a1a",
        fontSize: 11.5,
        cursor: "pointer",
        minWidth: 60,
        justifyContent: "space-between",
        lineHeight: 1,
      }}
    >
      {label}
      <ChevronDown style={{ width: 10, height: 10, color: "#4a4a4a" }} strokeWidth={2} />
    </button>
  );
}
