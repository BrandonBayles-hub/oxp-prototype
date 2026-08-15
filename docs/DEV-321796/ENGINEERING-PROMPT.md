# ENGINEERING-PROMPT — DEV-321796 Communications Translation

Paste this into Cursor as the kickoff prompt. The product behavior lives on Jira DEV-321796. This file is the build order, not the FE Doc.

## Goal

Add translation to Communications so staff can:

1. See a Translate / Show original header button only when a non-English language is detected on the thread.
2. Flip every translatable bubble in that thread with one click.
3. See provenance chips on translated bubbles (Translated · English, What you typed · English, Auto-translated · {language}).
4. Type English in the composer and send in the detected language, with a live preview and an on/off pill next to Attach.
5. Never attach an email signature to SMS or Voice.

## Architecture decisions

- **Detection is message-driven**, not a required resident-profile field. Scan `ConversationMessage.language` (and equivalents) for the first non-`en` code.
- **View language is thread-scoped UI state**, not a persisted server flag in v1. Remember per conversation id for the session (`viewInEnglishIds`).
- **Outbound translation is a send-time transform.** Store `text` = sent language, `originalText` = English draft, `language` = target code. Resident inbound uses `text` + `translation` (English).
- **Signatures are channel-gated.** Seed `-- Best regards` only when `channel === "Email"`. On SMS/Voice, clear composer on thread switch and strip a trailing `--` block before send.
- **Do not invent a new permission.** Reuse existing Communications reply access.
- **Company flag** `communications_translation` (name may match LaunchDarkly / entitlements). OFF = current Communications. ON = detection + UI.

## Implementation sequence

1. Types: `language?`, `translation?`, `originalText?` on conversation messages.
2. Detection helpers: `conversationDetectedLanguage`, `languageDisplayName`.
3. Header Translate / Show original button (bordered control, not a tag). Labels: Translate ↔ Show original.
4. `TranslatableMessageBody` driven by `showEnglish` from the header. Chips as specified. No per-bubble toggle buttons.
5. Composer: auto-translate pill + single-line preview; send path writes translated `text` + `originalText`.
6. Signature: Email-only seed; SMS/Voice clear + strip.
7. Flag gate so English-only and flag-off threads are unchanged.
8. Tests for detection, header toggle, send transform, signature strip.

## Key files in this repo (prototype reference)

- `app/conversations/page.tsx` — header button, composer pill/preview, `TranslatableMessageBody`, signature strip
- `lib/conversations-context.tsx` — message types, demo thread
- `lib/translation-demo-context.tsx` — flag-shaped toggle (replace with real flag)
- `lib/email-signature.ts` — signature template (`--` + Best regards)

Production work should follow the same UX contracts, not copy demo dictionaries as the real translator. Call the translation service for EN ↔ detected language.

## UX contracts (do not regress)

- Header control is a **button** labeled **Translate**, not a SPANISH tag.
- One header click flips the **entire** thread.
- Chips appear on translated bubbles in both views (see FE Doc After).
- Auto-translate pill sits next to Attach; preview is one truncated line.
- Private notes are never auto-translated.
- SMS/Voice must not send email signatures.

## Definition of Done

- [ ] Flag OFF: no Translate UI on any thread
- [ ] Flag ON + English-only thread: no Translate UI
- [ ] Flag ON + detected language: Translate button in header
- [ ] Translate / Show original flips all eligible bubbles
- [ ] Chips match the three labels in the FE Doc
- [ ] English reply + pill on → sent text is translated; English stored
- [ ] Pill off → sent text is English
- [ ] Email still gets signature; SMS/Voice do not
- [ ] Leftover `--` signature stripped on SMS/Voice send
- [ ] No new permission
- [ ] Accessibility: button has `aria-pressed`; chips are not the only cue (text labels)

## Do not

- Do not add per-message Show English buttons in the header-toggle design.
- Do not put signatures on SMS.
- Do not require a resident Preferred language field before showing Translate.
- Do not translate private notes.
- Do not mention prototype/demo controls in production copy.
- Do not ship the demo phrase-map as the only translator.

## Patterns to follow

- Header actions: same `h-8`, `border`, `px-2.5`, `text-xs` as Labels.
- Interactive control = border; display chip = fill (workspace design rules).
- Translation chips may use purple fill; they are markers, not extra toggles.
- Feature flag ON copy should read as a shipped product, not a demo beaker panel.
