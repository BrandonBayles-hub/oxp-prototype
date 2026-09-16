"use client";

/**
 * Floating notification widget for OXP Communications — SA 1.2 only.
 *
 * Renders in the OXP `/conversations` page whenever
 * `useConversationsDemo().notificationsEnabled === true` AND
 * `useConversationsDemo().superAgent12Enabled === true`. The
 * classic /conversations experience (and SA 1.0) stay pixel-
 * identical because the whole "Needs Action" concept the bell
 * counts is a SA 1.2 sidebar construct — outside SA 1.2 there is
 * no `isPropertyOwnedSA12` split, so the count wouldn't have a
 * meaningful semantics to point at.
 *
 * Behavior:
 *   • Idle (floating): a 56px circular blue-gradient FAB with a Bell
 *     glyph (the classic notification affordance) and a red count
 *     badge in the top-right when there are conversations waiting
 *     on a staff reply.
 *     Hover raises the shadow slightly. The blue-family gradient
 *     keeps the widget in the "manual/staff" palette lane (per
 *     workspace rule: blue/gray = staff context) while still reading
 *     as a warm, inviting notification pill rather than a plain
 *     black button.
 *   • Draggable: hold and drag the FAB anywhere in the viewport.
 *     The chosen position is remembered across sessions via
 *     localStorage (`STORAGE_KEY`). A pointerdown → pointerup with
 *     < 4px of movement is still treated as a click; anything more
 *     is a drag, which suppresses the click.
 *   • Edge dock (always): the FAB always snaps to a viewport edge
 *     on release — never floats in the middle. On drop we measure
 *     the distance to each of the four inset-adjusted edges
 *     (`computeDockSide`) and pick the smallest, so wherever the
 *     user lets go the FAB slides to the closest side (left,
 *     right, top, or bottom). The FAB then shifts outward via a
 *     CSS `translate` (horizontal for left/right docks, vertical
 *     for top/bottom docks) so only a small handle
 *     (`DOCK_PEEK_PX` = 36px) pokes back into the viewport. Inside
 *     that handle the bell glyph slides toward the visible edge
 *     (`DOCK_ICON_SHIFT_PX`) and the count badge glues itself to
 *     the visible corner of the handle so the "you have N to act
 *     on" signal remains legible even when the FAB is >60%
 *     off-screen. A stronger white ring plus a soft red glow
 *     makes the handle pop against the neutral OXP shell so staff
 *     can spot it out of the corner of an eye. Un-docking is
 *     temporary and mid-drag only: as soon as the user drops the
 *     FAB again it re-snaps to whichever edge is now nearest.
 *     Docked state is persisted alongside position so the bell
 *     stays where you left it between sessions.
 *   • Attention pop: when the needs-action count *increases*, the
 *     FAB briefly peeks all the way into the viewport (over ~1.2s)
 *     and returns to its docked state — the direction of the peek
 *     is derived from the dock side
 *     (bell-peek-{left,right,top,bottom}). Since the FAB is always
 *     docked, there is no "floating" shake state; the peek
 *     animation always fires. All keyframes live in a scoped
 *     `<style>` block at the bottom of this file so nothing leaks
 *     into globals. The same animation can be triggered on-demand
 *     via the "Preview pop-out" sub-button in the Communications
 *     Demo Control panel (which bumps `notificationPopSignal` in
 *     the demo context) — handy for walk-throughs where you want
 *     to show the affordance without waiting for a real inbound
 *     message.
 *   • Incoming toast: when the preview signal fires, the bell
 *     also slides a compact `<NotificationToast>` card in next to
 *     the FAB showing the top Needs Action thread's sender,
 *     channel, and preview line. Clicking the card jumps to the
 *     thread; the ×-pip dismisses it; and it auto-dismisses after
 *     `TOAST_MS`. Turns the pop from "a bell just wiggled" into
 *     "resident X just texted you, here's the first line" — the
 *     mental model users already have from macOS / iOS.
 *   • Open: clicking the FAB pops a compact panel with a header
 *     (title + count), a scrollable list of threads that need staff
 *     action, and a footer link to /conversations. Clicking any list row navigates
 *     to `/conversations/?id=<threadId>` — the page's `?id=` sync in
 *     `app/conversations/page.tsx` picks it up and force-selects the
 *     thread even if a sidebar filter would otherwise hide it — and
 *     closes the panel.
 *   • Panel placement: opens away from whichever edge the FAB is
 *     docked to — right of the handle when docked left, below the
 *     handle when docked top, etc. Along the un-docked axis (the
 *     one the FAB can still slide along) the panel is aligned to
 *     whichever half of the viewport the FAB sits in, so it
 *     always stays fully in view regardless of where the FAB is
 *     parked. The `<NotificationToast>` uses the same math with a
 *     narrower width.
 *
 * Notification set = the "Needs Action" bucket:
 *   `status === "open" && needsStaffResponse(c)`, further narrowed
 *   to property-owned threads (`isPropertyOwnedSA12`) when SA 1.2 is
 *   on so the bell matches the sidebar's Needs Action section 1:1.
 *   This is the same predicate the /conversations page uses to
 *   populate its "Needs Action" header — a thread the resident /
 *   lead is waiting on, or a thread Thread Automation dropped a
 *   follow-up reminder on. Read/unread state does not gate it: a
 *   thread staff opened but didn't reply to still owes a reply, so
 *   it stays in the bell.
 *
 * Per-channel filter:
 *   Threads are silenced by channel via
 *   `notifChannel{Voice,Sms,Email,ResidentPortal}` in the demo
 *   context. Silenced channels don't contribute to the bell's count
 *   and don't appear in the panel. Users edit the toggles from
 *   Thread Settings → Notifications; there is intentionally NO
 *   in-panel channel filter — that was noise for a widget whose
 *   whole job is "one glanceable queue."
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConversations } from "@/lib/conversations-context";
import type { ConversationItem } from "@/lib/conversations-context";
import {
  hasActiveFollowUpReminder,
  needsStaffResponse,
  parseAgeMinutes,
} from "@/lib/conversations-context";
import {
  getEffectiveEliMode,
  useConversationsDemo,
} from "@/lib/conversations-demo-context";

type NotificationChannelId = "Voice" | "SMS" | "Email" | "Resident Portal";
/**
 * Which viewport edge the FAB is docked against. All four sides are
 * valid — the FAB always snaps to whichever edge is closest on
 * drop. `null` is only the pre-hydration state, before the mount
 * effect has computed an initial dock side; the FAB is never
 * rendered in that state (see `if (position === null) return null`).
 */
type DockedSide = "left" | "right" | "top" | "bottom" | null;

/**
 * Normalize a `ConversationItem.channel` value into one of the four
 * notification-channel ids the demo tracks. Anything unrecognized
 * falls into SMS as a safe default — the demo dataset never emits an
 * unmapped channel, but we defensively bucket unknown values rather
 * than dropping them.
 */
function normalizeChannel(raw: string): NotificationChannelId {
  const lower = raw.trim().toLowerCase();
  if (lower === "voice" || lower === "phone" || lower === "call") return "Voice";
  if (lower === "email") return "Email";
  if (
    lower === "resident chat" ||
    lower === "chat" ||
    lower === "resident portal" ||
    lower === "portal"
  )
    return "Resident Portal";
  return "SMS";
}

/**
 * Icon per channel — used inside each row's leading circle.
 */
const CHANNEL_ICONS: Record<
  NotificationChannelId,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  Voice: Phone,
  SMS: MessageSquare,
  Email: Mail,
  "Resident Portal": MessageCircle,
};

/**
 * Short label per channel — used inline in each row's meta line.
 */
const CHANNEL_LABELS: Record<NotificationChannelId, string> = {
  Voice: "Voice",
  SMS: "SMS",
  Email: "Email",
  "Resident Portal": "Portal",
};

/**
 * Per-channel decorative color for the row's leading icon circle and
 * inline channel tag. Kept in lock-step with the palette used by
 * `ConversationListChannelChip` in `app/conversations/page.tsx` — the
 * source of truth for how each channel is colored throughout the OXP
 * Communications surface. If those colors change, mirror them here.
 *
 *   Email  = blue     (`border-blue-200 bg-blue-50 text-blue-800`)
 *   SMS    = emerald  (`border-emerald-200 bg-emerald-50 text-emerald-800`)
 *   Voice  = purple   (`border-purple-200 bg-purple-50 text-purple-800`)
 *   Portal = muted    (fallback treatment for Resident Chat in the
 *                      main chip component)
 */
const CHANNEL_ACCENTS: Record<
  NotificationChannelId,
  { bg: string; text: string }
> = {
  Voice: { bg: "bg-purple-50", text: "text-purple-800" },
  SMS: { bg: "bg-emerald-50", text: "text-emerald-800" },
  Email: { bg: "bg-blue-50", text: "text-blue-800" },
  "Resident Portal": { bg: "bg-muted", text: "text-muted-foreground" },
};

/** Persisted position for the draggable FAB. */
type BellPosition = { x: number; y: number };
type PersistedBellState = {
  position: BellPosition;
  docked: DockedSide;
};
const STORAGE_KEY = "oxp:communications-notification-bell:state";
/** Legacy key that stored `BellPosition` only, before edge-dock landed. */
const LEGACY_POSITION_STORAGE_KEY =
  "oxp:communications-notification-bell:position";
const FAB_SIZE = 56;
const VIEWPORT_INSET = 12;
const PANEL_WIDTH = 360;
const PANEL_GAP = 12;
/** Movement (in px) below which a pointerdown → pointerup counts as a click, not a drag. */
const CLICK_THRESHOLD_PX = 4;
/**
 * How many pixels of the docked FAB stick back into the viewport as a
 * "handle." Sized so the bell glyph (shifted toward the visible side
 * via `DOCK_ICON_SHIFT_PX`) plus the count badge remain legible from
 * across the room — the whole point of a docked notification is that
 * you can still see "there's an action-needed thread" without
 * pulling the bell out. 36px = a bit more than half of the FAB,
 * deliberately big
 * enough to read as an actual "bell tab" rather than a colored
 * sliver.
 */
const DOCK_PEEK_PX = 36;
/**
 * How far to translate the bell glyph toward the visible side when
 * docked. Half of the hidden portion (`(FAB_SIZE - DOCK_PEEK_PX)/2`)
 * so the icon lands centered inside the visible handle rather than
 * sitting invisibly in the FAB's hidden half. Applied on the X
 * axis for left/right docks and on the Y axis for top/bottom
 * docks — magnitude is the same either way because the peek zone
 * geometry is symmetric.
 */
const DOCK_ICON_SHIFT_PX = (FAB_SIZE - DOCK_PEEK_PX) / 2;

/**
 * Number by which the FAB shifts outward when docked. Derived so
 * exactly `DOCK_PEEK_PX` of the FAB stays visible: the FAB sits
 * flush against the docked edge (via `snapPositionToDock`) and the
 * CSS transform then shifts it further off-screen by this much.
 * Same magnitude for all four sides — used with `translateX` for
 * left/right docks and `translateY` for top/bottom docks.
 */
const DOCK_TRANSLATE_PX = FAB_SIZE + VIEWPORT_INSET - DOCK_PEEK_PX;

/** Milliseconds the "new notification" pop-out lasts. */
const RING_ANIMATION_MS = 1200;

/**
 * Width of the "incoming notification" toast card that slides in
 * next to the FAB when a preview signal fires. Kept narrower than
 * the full notifications panel so the toast reads as a spontaneous
 * pop-up rather than a full drawer.
 */
const TOAST_WIDTH = 320;
/**
 * How long the toast lingers before auto-dismissing. Longer than
 * the animation duration so the reader has time to actually scan
 * the sender's name and preview line before it disappears — 5s is
 * roughly the industry-standard "read a short message" dwell.
 */
const TOAST_MS = 5000;

/**
 * Clamp a candidate FAB position to viewport bounds so it never
 * escapes the visible area — used both when reading a persisted
 * position at mount and when handling window resize.
 */
function clampToViewport(
  pos: BellPosition,
  viewportWidth: number,
  viewportHeight: number,
): BellPosition {
  const maxX = Math.max(VIEWPORT_INSET, viewportWidth - FAB_SIZE - VIEWPORT_INSET);
  const maxY = Math.max(VIEWPORT_INSET, viewportHeight - FAB_SIZE - VIEWPORT_INSET);
  return {
    x: Math.min(Math.max(VIEWPORT_INSET, pos.x), maxX),
    y: Math.min(Math.max(VIEWPORT_INSET, pos.y), maxY),
  };
}

/** Default (bottom-right) position, computed lazily from window size. */
function defaultPosition(): BellPosition {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }
  return {
    x: window.innerWidth - FAB_SIZE - VIEWPORT_INSET - 8,
    y: window.innerHeight - FAB_SIZE - VIEWPORT_INSET - 8,
  };
}

/**
 * Compute which viewport edge the FAB should dock to given its
 * position at drop-time. Measures the distance from the FAB's
 * inset-adjusted edge to each viewport edge and picks the smallest —
 * so the widget always snaps to whichever side is closest, whether
 * that's left, right, top, or bottom. There is no "floating" middle
 * state; the FAB always ends up flush against one of the four edges
 * after a drop. Tie-breaking: horizontal edges (left, right) win
 * over vertical (top, bottom), and within each axis left/top wins
 * over right/bottom — deterministic so a bell dropped exactly in
 * a corner always resolves the same way.
 */
function computeDockSide(
  pos: BellPosition,
  viewportWidth: number,
  viewportHeight: number,
): "left" | "right" | "top" | "bottom" {
  const dLeft = pos.x - VIEWPORT_INSET;
  const dRight = viewportWidth - FAB_SIZE - VIEWPORT_INSET - pos.x;
  const dTop = pos.y - VIEWPORT_INSET;
  const dBottom = viewportHeight - FAB_SIZE - VIEWPORT_INSET - pos.y;
  const min = Math.min(dLeft, dRight, dTop, dBottom);
  if (min === dLeft) return "left";
  if (min === dRight) return "right";
  if (min === dTop) return "top";
  return "bottom";
}

/**
 * Given the FAB's clamped position and the docked side, snap the
 * corresponding axis to the exact edge so the FAB body sits flush
 * against it. The other axis is preserved so the user's drop
 * position (e.g., dragged to the top-middle of the screen) is
 * respected along the free dimension.
 */
function snapPositionToDock(
  pos: BellPosition,
  side: "left" | "right" | "top" | "bottom",
  viewportWidth: number,
  viewportHeight: number,
): BellPosition {
  if (side === "left") return { ...pos, x: VIEWPORT_INSET };
  if (side === "right")
    return { ...pos, x: viewportWidth - FAB_SIZE - VIEWPORT_INSET };
  if (side === "top") return { ...pos, y: VIEWPORT_INSET };
  return { ...pos, y: viewportHeight - FAB_SIZE - VIEWPORT_INSET };
}

export function CommunicationsNotificationBell() {
  const router = useRouter();
  // IMPORTANT: read `filteredItems` (not `items`) so the bell is
  // scoped to threads the /conversations page can actually surface
  // in its list. `items` is the raw seed pool and includes demo
  // threads whose demo toggle is off (Click-To-Call, SA 1.0, SA 1.2
  // breakouts, translation, etc.) plus threads outside the current
  // role's property scope — none of which the page can select. If
  // the bell drew from `items`, clicking a hidden thread would push
  // `?id=<invalid>`, the page's URL-sync guard would drop the
  // selection (`filteredItems.some(...) === false`), and the fallback
  // clobber would snap `selectedId` back to `filtered[0]` — i.e. the
  // click would silently no-op. Binding to `filteredItems` keeps the
  // bell and the sidebar list in lock-step so every surfaced row is
  // reachable.
  const { filteredItems: items } = useConversations();
  const {
    notificationsEnabled,
    notificationPopSignal,
    notifChannelVoice,
    notifChannelSms,
    notifChannelEmail,
    notifChannelResidentPortal,
    // SA 1.2 ownership state — mirrors the same fields the
    // /conversations page reads to compute `isPropertyOwnedSA12`
    // for the "Needs Action" bucket. Pulling them here lets the bell
    // apply the exact same predicate without re-implementing what
    // "property-owned" means or drifting out of sync with the
    // sidebar list.
    superAgent12Enabled,
    propertyOwnedThreadIds,
    eliModeByThreadId,
  } = useConversationsDemo();

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<BellPosition | null>(null);
  const [dockedSide, setDockedSide] = useState<DockedSide>(null);
  const [dragging, setDragging] = useState(false);
  // Set true whenever the needs-action count increases; drives the
  // attention-getter pop animation for both docked and floating
  // states. Cleared on a timer so the animation runs exactly once
  // per increase.
  const [justRinged, setJustRinged] = useState(false);
  // Preview toast — the "incoming notification" card that slides in
  // beside the FAB whenever either Preview pop-out button fires. It
  // shows the top Needs Action thread's sender + message preview so
  // the pop reads like a real notification arrival ("staff sees who
  // is texting them AND what they said"), not just an animated
  // bell. `null` = no toast in flight.
  const [previewingThread, setPreviewingThread] =
    useState<ConversationItem | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Drag state kept in a ref (not state) so pointermove updates don't
  // re-render on every mouse tick. The state above tracks committed
  // positions only.
  const dragStateRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startVisibleX: number;
    startVisibleY: number;
    moved: boolean;
  } | null>(null);
  // Latched flag that survives past `pointerup` so the synthetic
  // `click` event the browser fires immediately after a drag can be
  // suppressed. `dragStateRef` is nulled inside `handleUp` (see
  // below) which makes it useless for gating the click — the click
  // handler wouldn't see the `moved` flag anymore. This ref stays
  // true until the next tick, when the pending click has fired.
  const suppressNextClickRef = useRef(false);

  // Which channels currently notify. Mirrors the per-channel toggles
  // exactly so a disabled channel can never sneak into the list or
  // count.
  const enabledChannels = useMemo<Record<NotificationChannelId, boolean>>(
    () => ({
      Voice: notifChannelVoice,
      SMS: notifChannelSms,
      Email: notifChannelEmail,
      "Resident Portal": notifChannelResidentPortal,
    }),
    [
      notifChannelVoice,
      notifChannelSms,
      notifChannelEmail,
      notifChannelResidentPortal,
    ],
  );

  // The core notification set = the "Needs Action" bucket from the
  // /conversations page. Filters (in order):
  //
  //   1. `status === "open"` — closed threads don't nag anyone.
  //   2. `needsStaffResponse(c)` — the SAME predicate the SA 1.2
  //      "Needs Action" section uses (imported from
  //      `lib/conversations-context.tsx`). True whenever the most
  //      recent public message is from the lead/resident with no
  //      staff reply after it, OR when Thread Automation has dropped
  //      a follow-up reminder that staff hasn't acted on yet. Read
  //      state does NOT factor in — a thread staff has opened but
  //      not replied to still owes a reply, so it stays in the bell.
  //   3. SA 1.2 only: `isPropertyOwnedSA12(c)` — the same ownership
  //      predicate the sidebar's Needs Action section uses. This
  //      excludes threads Eli is still driving (which live under "No
  //      Action Needed" in SA 1.2). When SA 1.2 is off the concept
  //      doesn't exist, so we fall through to just #2 — the closest
  //      "staff attention required" definition available in the
  //      classic view.
  //   4. Channel currently enabled in the notification settings.
  //
  // Result is sorted newest-first so the most recent needs-action
  // thread is always at the top of the panel — same recency model
  // as the main /conversations sidebar list (both call
  // `parseAgeMinutes` from the conversations context). We clone
  // before sorting so the shared filteredItems array isn't mutated
  // in place.
  const isPropertyOwnedSA12 = useCallback(
    (c: ConversationItem): boolean => {
      // Inlined mirror of `isPropertyOwnedSA12` from
      // `app/conversations/page.tsx`. Keep in lock-step with that
      // definition — the two must agree or the bell will disagree
      // with the sidebar's Needs Action section.
      if (propertyOwnedThreadIds.has(c.id)) return true;
      if (c.labels.some((l) => l.endsWith("Escalation"))) return true;
      // Voice-origin threads (voicemail / missed call): Eli always
      // picks up first, so those are staff-owned callbacks.
      const ch = (c.channel || "").toLowerCase();
      if (ch === "voice" || ch === "phone") {
        if (
          c.messages.some(
            (m) => m.type === "voicemail" || m.type === "missed_call",
          )
        )
          return true;
      }
      // Staff flipped Eli off on this thread → staff owns it until
      // Eli is turned back on.
      if (getEffectiveEliMode(eliModeByThreadId, c.id).kind !== "on") return true;
      return false;
    },
    [propertyOwnedThreadIds, eliModeByThreadId],
  );

  const needsActionThreads = useMemo<ConversationItem[]>(() => {
    // The bell is a SA 1.2-only widget (see the top-level render
    // guard below), so both `isPropertyOwnedSA12` and
    // `needsStaffResponse` always apply — no classic-view fallback
    // path needed. This produces exactly the same set as the SA 1.2
    // sidebar's "Needs Action" section for the current sidebar
    // filter, minus channel-silenced threads.
    const list = items.filter((c) => {
      if (c.status !== "open") return false;
      if (!needsStaffResponse(c)) return false;
      if (!isPropertyOwnedSA12(c)) return false;
      const ch = normalizeChannel(c.channel);
      return enabledChannels[ch];
    });
    return [...list].sort(
      (a, b) => parseAgeMinutes(a.time) - parseAgeMinutes(b.time),
    );
  }, [items, enabledChannels, isPropertyOwnedSA12]);

  // Mirror the top Needs Action thread into a ref so the preview
  // effects can read "the freshest thread at the moment the pop
  // signal fires" without adding `needsActionThreads` to their
  // dependency arrays (which would re-run the animation whenever
  // any thread was added, edited, or resolved — noisy). The ref is
  // updated during render, which is fine here because we only read
  // it inside effects that run after commit.
  const topNeedsActionRef = useRef<ConversationItem | null>(null);
  topNeedsActionRef.current = needsActionThreads[0] ?? null;

  // Hydrate position + docked state from localStorage (or default to
  // bottom-right + un-docked) on mount. Keeping this in an effect
  // avoids SSR window access. Legacy schema (position-only) is
  // tolerated for a smooth upgrade path — reads apply the same clamp
  // and default to `docked: null`.
  useEffect(() => {
    let savedPosition: BellPosition | null = null;
    let savedDocked: DockedSide = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedBellState;
        if (
          parsed &&
          parsed.position &&
          typeof parsed.position.x === "number" &&
          typeof parsed.position.y === "number"
        ) {
          savedPosition = parsed.position;
          if (
            parsed.docked === "left" ||
            parsed.docked === "right" ||
            parsed.docked === "top" ||
            parsed.docked === "bottom" ||
            parsed.docked === null
          ) {
            savedDocked = parsed.docked;
          }
        }
      } else {
        // Fall back to the pre-dock schema so we don't reset the bell
        // for anyone who used the widget before this upgrade.
        const legacy = window.localStorage.getItem(
          LEGACY_POSITION_STORAGE_KEY,
        );
        if (legacy) {
          const legacyParsed = JSON.parse(legacy);
          if (
            legacyParsed &&
            typeof legacyParsed.x === "number" &&
            typeof legacyParsed.y === "number"
          ) {
            savedPosition = legacyParsed;
          }
        }
      }
    } catch {
      // Corrupt entry — fall back to default.
      savedPosition = null;
      savedDocked = null;
    }
    // The FAB always docks — no floating middle state. So on mount
    // we either restore the persisted dock side, or (for a fresh
    // session / legacy state / corrupt entry) compute the nearest
    // edge from the initial position. Then we snap the position to
    // sit flush against that edge so the FAB never renders slightly
    // "off" from the dock line.
    const initialPosition = savedPosition ?? defaultPosition();
    const clampedInitial = clampToViewport(
      initialPosition,
      window.innerWidth,
      window.innerHeight,
    );
    const initialDocked: "left" | "right" | "top" | "bottom" =
      savedDocked ??
      computeDockSide(
        clampedInitial,
        window.innerWidth,
        window.innerHeight,
      );
    const snappedInitial = snapPositionToDock(
      clampedInitial,
      initialDocked,
      window.innerWidth,
      window.innerHeight,
    );
    setPosition(snappedInitial);
    setDockedSide(initialDocked);
  }, []);

  // Re-clamp the FAB when the browser is resized so a bell parked at
  // the right edge doesn't fall off-screen when the window narrows.
  // Also re-evaluate dockedness: a resize that pulls the right edge
  // inward should keep a right-docked FAB right-docked (its position
  // will re-clamp against the new right edge), so we recompute
  // dockedness from the new position rather than dropping the state
  // on the floor.
  useEffect(() => {
    if (position === null) return;
    const onResize = () => {
      setPosition((prev) =>
        prev
          ? clampToViewport(prev, window.innerWidth, window.innerHeight)
          : prev,
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position]);

  // Attention-getter effect: fire the pop animation exactly once
  // whenever the needs-action count crosses upward. Only positive
  // transitions trigger the animation; a resolve/decrement doesn't
  // wave the bell around.
  const prevCountRef = useRef(0);
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = needsActionThreads.length;
    if (needsActionThreads.length > prev) {
      setJustRinged(true);
      const timer = setTimeout(
        () => setJustRinged(false),
        RING_ANIMATION_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [needsActionThreads.length]);

  // Demo-preview effect: re-run the same attention-getter animation
  // whenever the "Preview pop-out" button in the Communications Demo
  // Control panel increments `notificationPopSignal`. Skip the initial
  // 0 → 0 no-op that happens on mount by keeping our own ref of the
  // last-observed signal.
  const prevPopSignalRef = useRef(notificationPopSignal);
  useEffect(() => {
    if (notificationPopSignal !== prevPopSignalRef.current) {
      prevPopSignalRef.current = notificationPopSignal;
      // First force-clear so a spam-clicked preview button always
      // restarts the animation from frame 0 rather than being ignored
      // because `justRinged` is already true from the previous run.
      setJustRinged(false);
      // Kick the animation on the next tick so the class churn is
      // actually observed by the DOM (React batches otherwise).
      const kick = window.setTimeout(() => setJustRinged(true), 0);
      const settle = window.setTimeout(
        () => setJustRinged(false),
        RING_ANIMATION_MS,
      );
      // Fire the incoming-notification toast alongside the pop. The
      // ref snapshot is fine — we want "who's at the top right
      // now," not a live subscription to reordering.
      setPreviewingThread(topNeedsActionRef.current);
      return () => {
        window.clearTimeout(kick);
        window.clearTimeout(settle);
      };
    }
  }, [notificationPopSignal]);

  // Auto-dismiss the toast after `TOAST_MS`. Restarts the timer any
  // time a new preview replaces the current one (spam-clicking the
  // preview buttons keeps the freshest toast on-screen for the full
  // duration).
  useEffect(() => {
    if (!previewingThread) return;
    const timer = window.setTimeout(
      () => setPreviewingThread(null),
      TOAST_MS,
    );
    return () => window.clearTimeout(timer);
  }, [previewingThread]);

  // If the notifications panel opens, hide the toast — the panel
  // already shows the same thread (usually at the top of the list),
  // so leaving both on screen would be redundant and the toast's
  // fixed position could sit under the panel's shadow.
  useEffect(() => {
    if (open) setPreviewingThread(null);
  }, [open]);

  // Close on outside click / Escape. Guarded by both the panel and
  // the button ref so clicking the FAB re-toggles rather than firing
  // this and the FAB's onClick and cancelling each other out.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const persistState = useCallback(
    (pos: BellPosition, docked: DockedSide) => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ position: pos, docked } as PersistedBellState),
        );
      } catch {
        /* ignore quota errors */
      }
    },
    [],
  );

  // ---------------------------------------------------------------
  // Drag handling. Uses pointer events so the same code path handles
  // mouse and touch. We attach move/up listeners to `window` on
  // pointerdown and detach them on pointerup, so the drag survives
  // even if the pointer briefly leaves the button element (fast
  // drags).
  //
  // Docking wrinkle: when the drag starts on a docked FAB, we need
  // to record the "visible" starting X (i.e., the docked X = base X
  // shifted outward by DOCK_TRANSLATE_PX). Once the user commits to
  // a drag (moved > CLICK_THRESHOLD_PX) we clear `dockedSide` so
  // subsequent renders draw the FAB directly at `position.x` without
  // the transform — and then update `position.x` to the visible
  // starting X so there's no visual jump.
  // ---------------------------------------------------------------
  const beginDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (position === null) return;
      // Left-click / primary touch only.
      if (e.button !== 0) return;
      // Visible starting position: for a docked FAB, this is the
      // base position offset outward by the dock transform. The
      // drag math then tracks the pointer from this visible anchor
      // so the FAB doesn't jump when it un-docks.
      // Visible offset for the *currently* docked side. Horizontal
      // docks translateX; vertical docks translateY. This ensures
      // the drag math anchors on the FAB's rendered position (with
      // the dock transform baked in), so un-docking mid-drag doesn't
      // cause a visible jump when we clear `dockedSide`.
      const dockOffsetX =
        dockedSide === "left"
          ? -DOCK_TRANSLATE_PX
          : dockedSide === "right"
          ? DOCK_TRANSLATE_PX
          : 0;
      const dockOffsetY =
        dockedSide === "top"
          ? -DOCK_TRANSLATE_PX
          : dockedSide === "bottom"
          ? DOCK_TRANSLATE_PX
          : 0;
      dragStateRef.current = {
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startVisibleX: position.x + dockOffsetX,
        startVisibleY: position.y + dockOffsetY,
        moved: false,
      };

      const handleMove = (ev: PointerEvent) => {
        const s = dragStateRef.current;
        if (!s) return;
        const dx = ev.clientX - s.startPointerX;
        const dy = ev.clientY - s.startPointerY;
        // Once we cross the click threshold we commit to "drag":
        //   - Un-dock (so the FAB renders directly at position.x
        //     without the outward transform)
        //   - Suppress the click that would otherwise fire on
        //     pointerup.
        if (!s.moved && Math.hypot(dx, dy) > CLICK_THRESHOLD_PX) {
          s.moved = true;
          setDragging(true);
          setDockedSide(null);
        }
        if (s.moved) {
          // No clamp during drag so the FAB tracks the pointer
          // precisely — including small over-drags past the viewport
          // edge that will resolve to a dock snap on release. Final
          // clamp + dock-snap happens in `handleUp`.
          setPosition({
            x: s.startVisibleX + dx,
            y: s.startVisibleY + dy,
          });
        }
      };

      const handleUp = () => {
        const s = dragStateRef.current;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        if (s && s.moved) {
          // Latch the "just dragged" flag so the synthetic click event
          // that fires right after this pointerup won't toggle the
          // panel. Cleared on the next tick, after the click has run.
          suppressNextClickRef.current = true;
          setTimeout(() => {
            suppressNextClickRef.current = false;
          }, 0);
          // Snap: clamp position back inside the viewport, then
          // check for edge-dock. If within the snap threshold, dock
          // to that side and set position.x to the on-edge landing
          // point (the base — the CSS transform will shift the
          // rendered position outward). Otherwise stay floating at
          // the clamped position.
          setPosition((current) => {
            if (!current) return current;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const clamped = clampToViewport(current, viewportW, viewportH);
            // Always snap to the nearest of the four viewport edges.
            // `computeDockSide` never returns null, so `nextDocked`
            // is always a real side.
            const nextDocked = computeDockSide(clamped, viewportW, viewportH);
            const nextPos = snapPositionToDock(
              clamped,
              nextDocked,
              viewportW,
              viewportH,
            );
            setDockedSide(nextDocked);
            persistState(nextPos, nextDocked);
            return nextPos;
          });
        }
        setDragging(false);
        dragStateRef.current = null;
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [position, dockedSide, persistState],
  );

  if (!notificationsEnabled) return null;
  // SA 1.2-only: the whole notification model here is scoped to the
  // "Needs Action" bucket, which is a SA 1.2 concept (the sidebar's
  // Needs Action / No Action Needed split doesn't exist in the
  // classic view). Off SA 1.2 the bell would either show an
  // arbitrary predicate or an empty state, so we just hide it —
  // pairing Notifications with SA 1.2 keeps the count semantically
  // honest.
  if (!superAgent12Enabled) return null;
  if (position === null) return null; // waiting for mount hydration

  const totalCount = needsActionThreads.length;
  const badgeLabel = totalCount > 99 ? "99+" : String(totalCount);

  const handleOpenThread = (id: string) => {
    setOpen(false);
    router.push(`/conversations/?id=${id}`);
  };

  const handleFabClick = () => {
    // Guard: after a drag, the browser still dispatches a click event
    // on the FAB. `suppressNextClickRef` was latched in `handleUp`
    // and is cleared on the next tick, so this branch triggers for
    // the immediate post-drag click and no others.
    if (suppressNextClickRef.current) return;
    setOpen((v) => !v);
  };

  // Panel + toast placement.
  //
  // The FAB always docks against one of the four viewport edges, so
  // placement is driven by the dock direction:
  //   • Docked left  → panel opens to the right of the peek handle
  //   • Docked right → panel opens to the left  of the peek handle
  //   • Docked top   → panel opens below the peek handle
  //   • Docked bottom → panel opens above the peek handle
  //
  // The un-docked axis (the one the FAB can still slide along)
  // determines the panel's alignment on that axis: for a horizontal
  // dock we still pick top/bottom alignment by which half of the
  // viewport the FAB sits in, and vice versa for a vertical dock.
  // This keeps the panel from spilling off-screen when the FAB is
  // parked in a corner-adjacent slot.
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 900;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1600;
  const openBelow = position.y < viewportH / 2;
  const anchorLeft = position.x < viewportW / 2;

  // Compute horizontal + vertical placement for both panel and
  // toast in one place — same math, different widths.
  const commonHorizontal: React.CSSProperties =
    dockedSide === "left"
      ? { left: DOCK_PEEK_PX + PANEL_GAP }
      : dockedSide === "right"
      ? { right: DOCK_PEEK_PX + PANEL_GAP }
      : // Top/bottom dock: FAB can be anywhere along X → anchor by
        // whichever half of the viewport it's in.
      anchorLeft
      ? { left: position.x }
      : { right: viewportW - position.x - FAB_SIZE };
  const commonVertical: React.CSSProperties =
    dockedSide === "top"
      ? { top: DOCK_PEEK_PX + PANEL_GAP }
      : dockedSide === "bottom"
      ? { bottom: DOCK_PEEK_PX + PANEL_GAP }
      : // Left/right dock: FAB can be anywhere along Y → anchor by
        // whichever half of the viewport it's in.
      openBelow
      ? { top: position.y + FAB_SIZE + PANEL_GAP }
      : { bottom: viewportH - position.y + PANEL_GAP };

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    width: PANEL_WIDTH,
    maxWidth: `calc(100vw - ${VIEWPORT_INSET * 2}px)`,
    maxHeight: "min(70vh, 520px)",
    ...commonVertical,
    ...commonHorizontal,
  };
  const toastStyle: React.CSSProperties = {
    position: "fixed",
    width: TOAST_WIDTH,
    maxWidth: `calc(100vw - ${VIEWPORT_INSET * 2}px)`,
    ...commonVertical,
    ...commonHorizontal,
  };

  // FAB visual transform. Docked = shift outward via translateX/Y
  // so only DOCK_PEEK_PX pokes into the viewport; dragging disables
  // the transform (and its transition) so the FAB tracks the
  // pointer frame-perfectly. `justRinged` drives the docked-side-
  // specific peek animation for new notifications.
  const dockTransform = dragging
    ? undefined
    : dockedSide === "left"
    ? `translateX(-${DOCK_TRANSLATE_PX}px)`
    : dockedSide === "right"
    ? `translateX(${DOCK_TRANSLATE_PX}px)`
    : dockedSide === "top"
    ? `translateY(-${DOCK_TRANSLATE_PX}px)`
    : dockedSide === "bottom"
    ? `translateY(${DOCK_TRANSLATE_PX}px)`
    : undefined;
  // Animation keyframe name — picks a per-side peek animation for
  // each dock side (horizontal or vertical). Suppressed entirely
  // when dragging so a mid-drag notification never fights the
  // pointer for the FAB's transform.
  const animationName = dragging
    ? undefined
    : justRinged
    ? dockedSide === "left"
      ? "bell-peek-left"
      : dockedSide === "right"
      ? "bell-peek-right"
      : dockedSide === "top"
      ? "bell-peek-top"
      : dockedSide === "bottom"
      ? "bell-peek-bottom"
      : undefined
    : undefined;

  return (
    <>
      {/* Scoped keyframes for the attention-getter animations. Kept
          in-line so this widget is self-contained: no globals.css
          pollution and no risk of the keyframes being tree-shaken
          from an unused import. */}
      <style>{`
        @keyframes bell-peek-left {
          0%   { transform: translateX(-${DOCK_TRANSLATE_PX}px); }
          25%  { transform: translateX(0); }
          60%  { transform: translateX(0); }
          100% { transform: translateX(-${DOCK_TRANSLATE_PX}px); }
        }
        @keyframes bell-peek-right {
          0%   { transform: translateX(${DOCK_TRANSLATE_PX}px); }
          25%  { transform: translateX(0); }
          60%  { transform: translateX(0); }
          100% { transform: translateX(${DOCK_TRANSLATE_PX}px); }
        }
        /* Vertical peek variants — identical timing curve as the
           horizontal ones, translated along Y for top/bottom
           docks. Kept as their own keyframes (rather than a single
           bell-peek-in with a per-axis CSS variable) because
           browser support for animating transform via CSS
           variables is uneven, especially inside scoped inline
           style blocks in Next.js hydration. */
        @keyframes bell-peek-top {
          0%   { transform: translateY(-${DOCK_TRANSLATE_PX}px); }
          25%  { transform: translateY(0); }
          60%  { transform: translateY(0); }
          100% { transform: translateY(-${DOCK_TRANSLATE_PX}px); }
        }
        @keyframes bell-peek-bottom {
          0%   { transform: translateY(${DOCK_TRANSLATE_PX}px); }
          25%  { transform: translateY(0); }
          60%  { transform: translateY(0); }
          100% { transform: translateY(${DOCK_TRANSLATE_PX}px); }
        }
        /* Toast entrance — fades and slides in from the FAB
           direction. Kept short (220ms) so the card lands well
           before the user's eyes track over from the pop, and
           tuned to feel like a native OS-level notification
           slide-in. Exit is handled by React unmounting the
           element; no exit keyframe needed. */
        @keyframes bell-toast-in {
          0%   { opacity: 0; transform: translateY(6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Communications notifications"
          className="z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
          style={panelStyle}
        >
          {/* Header — a soft blue tint bar keeps the "notification
              center" feel warmer than a plain gray while still living
              inside the workspace's manual/staff palette rule (blue =
              staff context). Title + count only; no verbose subtitle
              since the zero-state row below covers the empty case. */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-b from-sky-50 to-background px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-sm"
                aria-hidden
              >
                <Bell className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <p className="text-sm font-semibold leading-none text-foreground">
                Notifications
              </p>
              {totalCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-status-error px-1.5 text-[11px] font-semibold text-status-error-foreground">
                  {badgeLabel}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close notifications"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable list. `flex-1` + `min-h-0` so the list soaks up
              remaining panel height and scrolls internally instead of
              pushing the footer off-screen. */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-background">
            {totalCount === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">
                  You&apos;re all caught up
                </p>
                <p className="text-xs text-muted-foreground">
                  Threads waiting on a staff reply will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {needsActionThreads.map((c) => (
                  <NotificationRow
                    key={c.id}
                    conversation={c}
                    onClick={() => handleOpenThread(c.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer — a single, understated link so the panel doesn't
              feel top-heavy. "Notification settings" ferries staff to
              Thread Settings → Notifications for per-channel silencing. */}
          <div className="flex items-center justify-end border-t border-border bg-muted/20 px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => {
                setOpen(false);
                router.push("/conversations/");
              }}
            >
              Open Communications
            </Button>
          </div>
        </div>
      )}

      {/* Incoming-notification toast. Slides in beside the FAB
          whenever either "Preview pop-out" button fires (or, in
          the future, whenever a real inbound notification lands).
          Shows the top Needs Action thread's sender, channel, and
          preview line — a "here's what just came in" affordance
          that turns the bell pop from an abstract animation into
          a concrete "resident X just texted you." Only rendered
          when the notifications panel is closed (see the
          `useEffect` that clears the toast on `open`), so the
          panel and the toast can't visually collide. */}
      {previewingThread && !open && (
        <NotificationToast
          conversation={previewingThread}
          style={toastStyle}
          onClose={() => setPreviewingThread(null)}
          onOpen={() => {
            const id = previewingThread.id;
            setPreviewingThread(null);
            router.push(`/conversations/?id=${id}`);
          }}
        />
      )}

      {/* The floating notification bell. Draggable via pointer events —
          hold and move; short taps still register as clicks so the
          panel toggle is intact. We render the FAB as `position:
          fixed` at the tracked position rather than inside a
          container so the drag math stays trivially "pointer position
          → committed position." */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleFabClick}
        onPointerDown={beginDrag}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          totalCount === 0
            ? dockedSide
              ? "Communications notifications (docked — drag inward or click to open)"
              : "Communications notifications (drag to move)"
            : `${totalCount} conversation${totalCount === 1 ? "" : "s"} need${totalCount === 1 ? "s" : ""} action${dockedSide ? " (docked)" : " (drag to move)"}`
        }
        title={
          dockedSide
            ? totalCount === 0
              ? "Notifications — drag to un-dock"
              : `${totalCount} need${totalCount === 1 ? "s" : ""} action — drag to un-dock`
            : totalCount === 0
            ? "Notifications"
            : `${totalCount} need${totalCount === 1 ? "s" : ""} action — drag to move`
        }
        className={cn(
          "z-50 flex items-center justify-center rounded-full text-white shadow-lg",
          // Escalation-red gradient FAB. Uses the same red family as
          // the `variant="destructive"` escalation labels on threads
          // (see `Badge` in `components/ui/badge.tsx` and the
          // `--destructive` token in `app/globals.css`) so a
          // notification bell always reads as "attention needed" in
          // the same color language staff already recognize from
          // escalation chips throughout the surface. Deliberately not
          // pure `bg-destructive` — a subtle red-500 → red-600
          // gradient gives the 56px pill a bit of depth without
          // drifting off the destructive token's hue.
          "bg-gradient-to-br from-red-500 to-red-600",
          "ring-1 ring-black/5",
          "hover:shadow-xl hover:from-red-400 hover:to-red-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          dragging
            ? "cursor-grabbing shadow-xl scale-105"
            : "cursor-grab active:cursor-grabbing",
          // Docked "handle" look — a stronger white ring plus a soft
          // red glow (mirroring the FAB body color) makes the tab pop
          // against the neutral OXP shell so staff can spot it out of
          // the corner of an eye without needing the pop animation to
          // fire. Hover deepens the glow as a "grabbable" affordance.
          dockedSide &&
            !dragging &&
            "ring-2 ring-white/60 shadow-[0_0_0_1px_rgba(185,28,28,0.35),0_6px_20px_-4px_rgba(185,28,28,0.55)] hover:shadow-[0_0_0_1px_rgba(185,28,28,0.55),0_10px_28px_-4px_rgba(185,28,28,0.7)]",
        )}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: FAB_SIZE,
          height: FAB_SIZE,
          // Disable native touch scrolling on the FAB during drag.
          touchAction: "none",
          // When docked (and not dragging) we transform outward so
          // only the peek handle stays in-viewport. Transitions on
          // the transform keep the docking motion smooth; the
          // "just ringed" animation overrides the transform via
          // keyframes for the pop-out attention grabber.
          transform: dockTransform,
          transition: dragging
            ? "none"
            : "transform 220ms ease, box-shadow 200ms ease",
          animation: animationName
            ? `${animationName} ${RING_ANIMATION_MS}ms ease-in-out`
            : undefined,
        }}
      >
        {/*
          Bell glyph. When docked, we shift it toward the visible side
          of the FAB (left dock → shift right, right dock → shift left)
          so the icon actually shows up inside the visible handle strip
          rather than being trapped in the off-screen half of the FAB.
          The transition on transform makes the shift feel like the
          icon slides into view as the FAB docks.
        */}
        <Bell
          className="h-6 w-6 drop-shadow-sm"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.15}
          aria-hidden
          style={{
            // Slide the glyph toward the visible edge of the peek
            // handle so the icon is actually in-viewport when
            // docked — otherwise a right/bottom docked FAB would
            // hide the icon in its off-screen half.
            //   • Docked left   → shift right  (+DOCK_ICON_SHIFT_PX on X)
            //   • Docked right  → shift left   (−DOCK_ICON_SHIFT_PX on X)
            //   • Docked top    → shift down   (+DOCK_ICON_SHIFT_PX on Y)
            //   • Docked bottom → shift up     (−DOCK_ICON_SHIFT_PX on Y)
            transform:
              dragging || !dockedSide
                ? undefined
                : dockedSide === "left"
                ? `translateX(${DOCK_ICON_SHIFT_PX}px)`
                : dockedSide === "right"
                ? `translateX(-${DOCK_ICON_SHIFT_PX}px)`
                : dockedSide === "top"
                ? `translateY(${DOCK_ICON_SHIFT_PX}px)`
                : `translateY(-${DOCK_ICON_SHIFT_PX}px)`,
            transition: dragging
              ? "none"
              : "transform 220ms ease",
          }}
        />
        {totalCount > 0 && (() => {
          // Count badge. When docked, we glue it to the top of the
          // *visible* portion of the FAB so it stays on-screen and
          // legible — a right-docked FAB's default `-right-1 -top-1`
          // badge would translate past the viewport's right edge and
          // disappear, and a left-docked FAB's default would be
          // partially cropped on the left. Positioning the badge
          // inside the peek zone (rather than protruding past the
          // FAB edge) keeps the count fully visible on both sides —
          // critical for the "how many need action?" glance when
          // the bell is tucked away.
          //
          // Placement values are in button-local coordinates so they
          // ride along with the FAB's `translateX` and land on the
          // correct handle edge visually.
          //   • Floating           →  `right: -4px, top: -4px`
          //     (classic overlap of the FAB's top-right corner)
          //   • Docked left        →  `right: 0px, top: -6px`
          //     (badge on the top-right of the visible right-half)
          //   • Docked right       →  `left: 0px, top: -6px`
          //     (badge on the top-left of the visible left-half)
          const badgeInset: React.CSSProperties =
            dockedSide === "left"
              ? // Peek zone is the right half of the FAB → put the
                // badge on the right edge of the visible strip.
                { right: 0, top: -6 }
              : dockedSide === "right"
              ? // Peek zone is the left half of the FAB → put the
                // badge on the left edge of the visible strip.
                { left: 0, top: -6 }
              : dockedSide === "top"
              ? // Peek zone is the bottom half of the FAB → put the
                // badge at the bottom-right of the visible strip so
                // it sits inside the tab, not above the tab in
                // hidden space.
                { right: -4, bottom: -4 }
              : dockedSide === "bottom"
              ? // Peek zone is the top half of the FAB → classic
                // top-right corner overlap works because the top of
                // the FAB is what's visible.
                { right: -4, top: -4 }
              : { right: -4, top: -4 };
          return (
            <>
              {/* Halo pulse — a quick ping ring around the count
                  badge whenever a new notification lands. Uses a
                  lighter red (`bg-red-300`) so it stays visible on
                  the red-500/600 FAB body but stays inside the
                  destructive hue family. Suppressed once the
                  animation completes so the FAB doesn't feel busy. */}
              {justRinged && (
                <span
                  className="pointer-events-none absolute inline-flex h-5 w-5 animate-ping rounded-full bg-red-300 opacity-80"
                  style={badgeInset}
                  aria-hidden
                />
              )}
              {/*
                Count pill inverted for the red FAB: white body with
                red digits, ringed in the FAB's own red so the pill
                separates cleanly from the button body without
                looking like it's floating. On a red FAB the
                original `bg-status-error text-status-error-foreground`
                would blend into the button body — this inversion
                keeps the count glanceable at any dock state.
              */}
              <span
                className="pointer-events-none absolute inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold text-red-700 ring-2 ring-red-600"
                style={badgeInset}
                aria-hidden
              >
                {badgeLabel}
              </span>
            </>
          );
        })()}
      </button>
    </>
  );
}

/**
 * "Incoming notification" toast card. Rendered by the bell whenever a
 * preview signal fires so the pop reads like a real notification
 * arrival: bell animates AND a card slides in showing exactly who
 * sent something and what they said. The whole card is clickable
 * and jumps straight to the thread; a small `×` in the corner
 * dismisses without navigating. Auto-dismisses after `TOAST_MS`.
 *
 * The visual language borrows from OS-level notification toasts
 * (macOS Notification Center, iOS lock-screen alerts): rounded
 * card, drop shadow, elevated ring, subtle slide-in via a scoped
 * `bell-toast-in` keyframe. Channel accent circle on the left
 * mirrors the notification-panel row so the two surfaces feel
 * like the same signal at different magnifications.
 */
function NotificationToast({
  conversation,
  style,
  onOpen,
  onClose,
}: {
  conversation: ConversationItem;
  style: React.CSSProperties;
  onOpen: () => void;
  onClose: () => void;
}) {
  const channelId = normalizeChannel(conversation.channel);
  const Icon = CHANNEL_ICONS[channelId];
  const accent = CHANNEL_ACCENTS[channelId];
  const isFollowUpAutomation = hasActiveFollowUpReminder(conversation);
  return (
    <div
      role="alertdialog"
      aria-label={`Incoming ${CHANNEL_LABELS[channelId]} from ${conversation.resident}`}
      className="relative z-50 overflow-hidden rounded-xl border border-border bg-background shadow-xl ring-1 ring-black/5"
      style={{
        ...style,
        animation: "bell-toast-in 220ms ease-out",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            accent.bg,
            accent.text,
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {/* Small caps "New message" affordance so the toast
                doesn't just look like a list row — it needs to
                read as a discrete alert event. */}
            <span
              className={cn(
                "inline-flex h-4 items-center rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                accent.bg,
                accent.text,
              )}
            >
              New {CHANNEL_LABELS[channelId]}
            </span>
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
              {conversation.time}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {conversation.resident}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {conversation.channel === "Email" && conversation.emailSubject ? (
              <>
                <span className="font-medium text-foreground/80">
                  {conversation.emailSubject}
                </span>
                {" — "}
                {conversation.preview}
              </>
            ) : (
              conversation.preview
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            {isFollowUpAutomation && (
              <span
                aria-label="Follow-up reminder triggered by Thread Automation"
                title="Follow-up reminder triggered by Thread Automation"
                className="inline-flex h-4 shrink-0 items-center gap-1 rounded bg-cyan-100/70 px-1.5 font-medium uppercase tracking-wide text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200"
              >
                <BellRing className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                Follow up
              </span>
            )}
            <span className="min-w-0 truncate">{conversation.property}</span>
          </div>
        </div>
      </button>
      {/* Close pip. Sits outside the row `<button>` so clicking it
          doesn't also trigger `onOpen`. Uses a `stopPropagation`
          plus its own onClick handler for safety even though the
          card's button isn't a parent. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

/**
 * A single row in the notification list. Uses a channel-tinted
 * leading circle for at-a-glance channel differentiation, then the
 * sender name and a short preview. The compact meta line ties the
 * row back to its channel label, property, and timestamp — same
 * information density as the main thread-list card but at a smaller
 * footprint.
 */
function NotificationRow({
  conversation,
  onClick,
}: {
  conversation: ConversationItem;
  onClick: () => void;
}) {
  const channelId = normalizeChannel(conversation.channel);
  const Icon = CHANNEL_ICONS[channelId];
  const accent = CHANNEL_ACCENTS[channelId];
  // Whether Thread Automation has an unresolved follow-up reminder
  // firing on this thread. Uses the same predicate + visual treatment
  // (`BellRing` icon + cyan chip) as the main thread-list card in
  // `app/conversations/page.tsx` so staff sees a consistent
  // "follow-up automation is watching this" signal wherever the
  // thread surfaces.
  const isFollowUpAutomation = hasActiveFollowUpReminder(conversation);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/70 focus-visible:outline-none"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            accent.bg,
            accent.text,
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {conversation.resident}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {conversation.time}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {conversation.channel === "Email" && conversation.emailSubject ? (
              <>
                <span className="font-medium text-foreground/80">
                  {conversation.emailSubject}
                </span>
                {" — "}
                {conversation.preview}
              </>
            ) : (
              conversation.preview
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              className={cn(
                "inline-flex h-4 items-center rounded px-1.5 font-medium uppercase tracking-wide",
                accent.bg,
                accent.text,
              )}
            >
              {CHANNEL_LABELS[channelId]}
            </span>
            {/* Follow-up automation chip. Mirrors the treatment in
                `ConversationListChannelChip`'s sibling chip on the
                thread-list card: cyan-100 bg + cyan-800 text +
                `BellRing` icon so the two surfaces read as the same
                signal. Only rendered when Thread Automation has an
                unresolved follow-up reminder on this thread. */}
            {isFollowUpAutomation && (
              <span
                aria-label="Follow-up reminder triggered by Thread Automation"
                title="Follow-up reminder triggered by Thread Automation"
                className="inline-flex h-4 shrink-0 items-center gap-1 rounded bg-cyan-100/70 px-1.5 font-medium uppercase tracking-wide text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200"
              >
                <BellRing className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                Follow up
              </span>
            )}
            <span className="min-w-0 truncate">{conversation.property}</span>
          </div>
        </div>
      </button>
    </li>
  );
}
