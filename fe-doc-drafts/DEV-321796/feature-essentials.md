**FE Doc - Before**

Today, staff who work resident and lead conversations in Communications (the Communication Panel) have no in-product way to read or reply when the other person writes in a language other than English. The conversation opens as a normal thread. The resident name, property, channel (Email, SMS, or Voice), and message history all appear as usual. The message body stays in the language it was written in. There is no Translate control in the conversation header, no language label on messages, and no help in the reply box.

This creates three specific problems on the screens staff already use.

**Unread or delayed replies in Communications >> Open Threads.** A leasing or resident services teammate opens a thread from the conversation list, sees Spanish (or another language) in the bubble, and cannot act until they understand it. The usual workaround is to copy the message into a separate browser translator, read the English there, type an English reply in that other tool, copy the translated reply back into Communications, and send. That round trip typically takes 3 to 8 minutes per conversation, depending on message length and whether the thread has more than one inbound message. While that happens, the thread stays open and waiting. Other teammates who open the same conversation have to repeat the same copy-and-paste work because nothing in Communications remembers that a translation was already done.

**Mistakes when the reply is sent in the wrong language or with leftover email text.** Staff type in English in the Communications composer. If they forget to translate before Send, the resident receives English. If they paste a translation and accidentally include an email signature block (the "-- Best regards" block used on Email), that signature can go out on SMS. Communications today does not stop a signature from riding along on a text message. Residents then receive a long SMS that mixes a short answer with office phone numbers and sign-off lines that do not belong on a text.

**No shared view of what was actually sent versus what staff meant.** After send, the thread only shows the outbound text. There is no label that says the message was translated, and no one-click way to see the English the teammate typed. A supervisor reviewing Communications >> conversation history, or a teammate picking up the thread on the next shift, cannot tell whether the Spanish on the bubble is what the resident wrote, what staff typed, or what a translator produced. Handoffs take extra time. [INSERT: Customer name and CS ticket if available - for example, a community that reported delayed replies or copy-and-paste errors on non-English resident threads.]

At portfolio scale the time adds up. A 20-property group that handles about 15 non-English threads per week, at 5 minutes of outside-translator work each, spends about 75 hours per month on a step that never appears in Communications. That time is taken from answering the next resident, not from a new task staff chose to add.

**FE Doc - After**

After this release, Communications detects when a conversation is in a language other than English and gives staff translation on that thread only. English-only threads look the same as they do today. Nothing new appears if no other language is found.

- **Language detection on the open conversation.** When staff open a thread in Communications, the product checks the messages already on the thread. If a language other than English is found (for example Spanish), translation tools appear for that conversation. If every message is English, the Translate button does not show. Staff do not pick a language from a list to start.

- **Translate button in the conversation header.** Path: Communications >> open a conversation >> header next to the resident name and property. The control is a button labeled Translate, with a language icon. It matches the size and shape of other header actions such as Labels. It is a button, not a colored language tag.

- **One click translates the whole thread.** Click Translate. Every message that has an English version switches to English at once. Staff do not click each bubble. The button label changes to Show original.

- **Show original returns the thread to the sent language.** Click Show original. Every message returns to the language that was actually sent or received. The button label returns to Translate. The choice is remembered for that conversation during the session so switching away and back does not reset it by surprise.

- **Labels on translated messages.** When Show original is on (the thread is in English), resident messages that were translated show a small Translated - English label on the bubble. Replies staff typed in English show What you typed - English. When the thread is back in the original language, staff replies that were auto-translated show Auto-translated - Spanish (or the detected language). These labels are markers, not extra buttons.

- **Reply in English, send in the resident language.** Path: Communications >> conversation >> reply box. Staff type in English. When auto-translate is on, Send stores and delivers the reply in the detected language. The English staff typed is kept with the message so Show original can display it later.

- **Live preview in the composer.** As staff type, a single-line preview under the reply box shows the wording that will be sent. Hovering the preview shows the full translated text if it is longer than one line. The preview only appears when there is text to translate and auto-translate is on.

- **Spanish (or detected language) pill next to Attach.** Path: Communications >> conversation >> reply box footer, beside Attach. A compact pill shows the target language. Purple fill means auto-translate is on. Plain style means it is off. Click the pill to turn auto-translate on or off. Hover text explains the current state. Private notes are not translated.

- **Email signatures stay on Email only.** The "-- Best regards" signature block is added only when the conversation channel is Email. SMS and Voice composers stay empty of that block. If a leftover signature is still in the box from a previous Email thread, it is removed before an SMS or Voice send.

- **Language chip on the conversation card.** When translation is available for a thread, the conversation list card can show the detected language next to the channel (Email, SMS, or Voice) so staff can spot non-English threads before they open them.

If translation cannot run (empty reply, or auto-translate off), Send behaves as it does today and sends the text in the box. Staff see a clear on/off control rather than a silent failure.

**FE Doc - NOT Included**

- **Voice call live interpretation.** This release does not translate a live phone call in real time. Voice threads can show SMS or notes that were translated, but spoken audio is not interpreted during the call.

- **Staff-chosen language pack beyond the detected language.** Staff cannot open a language picker and force the thread into French, Chinese, or another language if the conversation was detected as Spanish. The product follows the language already on the thread.

- **Offline or third-party translator export.** There is no "Open in Google Translate" or download of a translation file. All translation stays inside Communications.

- **Bulk translate across many conversations.** There is no select-all on the conversation list to translate 20 threads at once. Translation is per open conversation.

- **Resident-facing translation settings.** Residents do not get a "show this in English" toggle in a resident app or email footer as part of this epic. This is a staff tool on the Communication Panel.

- **New language preference on the resident profile as a required setup step.** Staff do not have to open the resident profile and set Preferred language before Translate appears. Detection comes from the conversation itself. A future profile preference can still be used when it exists; it is not required to use this release.

- **Editing a sent translation after the fact.** Staff cannot open a sent bubble and rewrite only the translated side. They send a new reply if the wording needs to change.

- **Automatic translation of private notes and internal activity.** Private notes, handoff lines, and activity-log entries stay in the language staff typed. Only public replies in the conversation can auto-translate on send.

**FE Doc - New Permissions**

No new permissions are required. Translation uses the same access staff already have to open and reply in Communications. If a user can read a conversation and send a public reply today, they can use Translate, Show original, and auto-translate on that conversation. If a user cannot open Communications or cannot send a reply, they do not see a working translation flow.

There is no new row under Setup >> Users and Roles >> Permissions. Administrators do not assign a separate "Translate conversations" permission in this release. Oversight of who may message residents remains the existing Communications reply permission.

**FE Doc - Settings**

No new customer-facing setting screen is required for day-to-day use. Once the feature is on for the company, Translate appears automatically on conversations where a language other than English is detected. Staff do not go to Setup to turn translation on for one resident.

**Company feature flag:** Communications Translation
- Type: Company-level feature flag
- Default: OFF until Entrata enables the company
- ON: Detected non-English conversations show the Translate button, message labels, and reply auto-translate
- OFF: Communications looks and behaves as it does today. No Translate button, no language labels, no auto-translate in the reply box
- Location: Enabled by Entrata for the company. Not a self-serve toggle under Setup >> Company in this release

**In-conversation staff control (not a Setup setting):** The Spanish (or detected language) pill next to Attach turns auto-translate on or off for the reply the staff member is writing. That choice is a working control on the conversation, not a company setting.

**What is not a setting:** There is no Setup >> Property >> Communications >> Default reply language page in this release. There is no per-property "always translate to English" checkbox.

**Test environment:** Use a standard Entrata QA company that already has Communications. Open a resident thread that contains non-English messages (the QA conversation used for Communications translation). [INSERT: QA company name and property if a dedicated test property is assigned.] No separate translation-only website is required.

**FE Doc - Who**

- **Leasing specialist (on-site or central).** Reads a lead or resident SMS in Spanish from Communications without leaving the thread, then types the answer in English and sends it in Spanish. Saves the 3 to 8 minute copy-and-paste trip on each non-English lead conversation and reduces the chance of sending an English-only reply during a busy tour day.

- **Resident services or assistant community manager.** Handles open resident threads about maintenance, rent questions, or renewal follow-up. Uses Translate once on the header to read the full history in English, then uses Show original before calling the resident so they can quote the resident's actual words. Shift handoffs are faster because the next teammate sees What you typed - English on staff replies.

- **Central communications or contact-center agent.** Works a shared inbox across many properties. Spots non-English threads from the language chip on the conversation card, opens the thread, and replies in the resident's language without a second monitor running a translator. Consistency improves because every agent on the same thread sees the same Translate / Show original state for that conversation during the session.

- **Community manager or supervisor reviewing quality.** Opens a completed or in-progress conversation and uses Show original to confirm what the resident wrote, then Translate to confirm what the team sent. The Auto-translated label shows which outbound messages went through translation, which supports coaching without asking the agent to reconstruct the steps.

**FE Doc - Why**

Residents and leads already write to the community in the language they use every day. Staff still have to answer those messages inside Communications. Without translation on the Communication Panel, every non-English thread becomes a side task: leave the product, translate, come back, paste, hope nothing extra (like an email signature) went with the SMS.

Time is the measurable cost. 15 non-English threads per week × 5 minutes of outside translation × 20 properties is about 75 hours per month that never shows up as "answered in Communications." Speed matters as well. A resident who asked about air conditioning in the morning should not wait until someone finds time to use another website.

Accuracy is the second cost. A pasted reply can drop a sentence, keep English mixed with Spanish, or attach an email sign-off to a text. Supervisors cannot see what the agent intended versus what was sent.

[INSERT: Customer name, CS ticket, or escalation that asked for in-product translation on Communications. If a competitor already offers in-inbox translation, name that product and the gap called out in the deal or renewal.]

This is needed now because Communications is already the place staff live for Email, SMS, and Voice. Adding translation there keeps the reply, the record, and the language label in one thread instead of splitting the work across tools.

**FE Doc - FAQs**

**Q: Does Translate appear on every conversation?**
* A: No. Translate appears only when Communications detects a language other than English on that thread. English-only conversations stay unchanged.

**Q: Which languages are supported?**
* A: This release is built around the language detected on the conversation, with Spanish as the first supported language for staff-to-resident replies. Other languages can show a language label when they are detected. [INSERT: Full production language list if more locales are confirmed for GA.]

**Q: Do I have to translate each message one at a time?**
* A: No. Click Translate in the conversation header once. The whole thread switches to English. Click Show original to switch the whole thread back.

**Q: How do I know a message was translated?**
* A: Translated bubbles show a small label. In English view you will see Translated - English on the other person's messages and What you typed - English on your replies. In the original-language view, your auto-translated replies show Auto-translated plus the language.

**Q: Can I type in English and still send a Spanish reply?**
* A: Yes. Keep the language pill next to Attach turned on (purple). Type in English. The preview shows the Spanish that will be sent. Click Send. The resident receives the Spanish version. Your English stays on the message so you can show it later.

**Q: What if I want to send English on purpose?**
* A: Click the language pill next to Attach so it is off. The preview hides. Send delivers the text in the box, in English.

**Q: Will my email signature go out on a text message?**
* A: No. Signatures are added only on Email conversations. SMS and Voice do not get the signature block. If you just left an Email thread, any leftover signature is stripped before an SMS or Voice send.

**Q: Are private notes translated?**
* A: No. Private notes stay in the language you type. They still save to the conversation and the activity log. Only public replies use auto-translate.

**Q: What happens if translation is turned off for the company?**
* A: Communications looks like it does today. There is no Translate button, no language labels, and no auto-translate pill. Existing messages remain on the thread in the language that was stored when they were sent.

**Q: Do I need a new permission?**
* A: No. If you can open the conversation and send a reply today, you can use translation on that conversation.

**Q: Does this translate a live phone call?**
* A: No. Live call interpretation is not part of this release. You can still translate written messages on a Voice thread, such as a follow-up SMS.

**Q: Can the resident turn this off?**
* A: This is a staff tool. Residents do not get a separate toggle in this release. They receive the message in the language that was sent.

**Adoption Method Details**

Rollout is a company-level feature flag named Communications Translation. Default is OFF. Entrata turns the flag ON for a company when that company is ready. Customers do not enable this themselves under Setup in this release.

**Who enables it:** Entrata (product operations or the account team) turns the company flag on. Community staff do not need a setup project, a data migration, or a training course to start. After the flag is on, they open Communications as usual.

**Before enablement (flag OFF):** Communications is unchanged. Staff who receive a non-English message still use an outside translator if they need English.

**After enablement (flag ON):** On any conversation where a language other than English is detected, staff see Translate in the header, labels on translated messages, and the auto-translate pill in the reply box. English-only conversations do not change.

**What staff must do:** Nothing required at first login. Optional: click Translate when they want the thread in English; click the language pill if they want to send English instead of an auto-translated reply.

**Phased Rapid Release:** Yes. Enable company by company. Start with companies that already use Communications for SMS and Email and have a known volume of non-English threads. Expand after those companies confirm that Translate, Show original, and SMS-without-signature behave as described.

**Impact Areas**

Leasing, Resident Management, Maintenance

**Critical Workflows Impacted**

Leasing, Renewal/Transfer

**Adoption Method**

Required at GA
