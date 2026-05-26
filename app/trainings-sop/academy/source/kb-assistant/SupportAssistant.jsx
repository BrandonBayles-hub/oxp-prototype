/* eslint-disable react/no-unescaped-entities */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Send, X, ExternalLink, MessageSquare, User, AlertTriangle, Loader2 } from "lucide-react";
import { streamKbAssistant, askKbAssistant, handoffKbAssistantTurn } from "../api";

const ZENDESK_SUBDOMAIN = (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN) || "entratasupport";

// Simple, dependency-free markdown-ish renderer for the bot's answer.
// Handles **bold**, *italic*, inline code, bullet lists, numbered lists, and
// paragraph breaks. Good enough for LLM responses; never rendered unescaped
// HTML.
function renderMd(md) {
  if (!md) return null;
  const escape = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  let html = escape(md).trim();
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  const blocks = html.split(/\n{2,}/).map(block => {
    const lines = block.split("\n");
    if (lines.every(l => /^\s*\d+\.\s+/.test(l))) {
      return `<ol>${lines.map(l => `<li>${l.replace(/^\s*\d+\.\s+/, "")}</li>`).join("")}</ol>`;
    }
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
      return `<ul>${lines.map(l => `<li>${l.replace(/^\s*[-*]\s+/, "")}</li>`).join("")}</ul>`;
    }
    return `<p>${lines.join("<br />")}</p>`;
  });
  return <div className="kba-md" dangerouslySetInnerHTML={{ __html: blocks.join("") }} />;
}

function buildTicketUrl(subject, body) {
  const subj = encodeURIComponent(String(subject || "").slice(0, 180));
  const desc = encodeURIComponent(String(body || "").slice(0, 3500));
  return `https://${ZENDESK_SUBDOMAIN}.zendesk.com/hc/en-us/requests/new?tf_subject=${subj}&tf_description=${desc}`;
}

function SourceChip({ source, onClick }) {
  return (
    <button className="kba-source-chip" onClick={() => onClick && onClick(source)} title={source.title}>
      <ExternalLink size={11} />
      <span>{source.title}</span>
    </button>
  );
}

function HandoffPanel({ turn, question, answerMd, onOpenTicket, onDismiss }) {
  const subject = (question || "").slice(0, 140) || "Question from the Support Assistant";
  const transcript = [
    "I used the Entrata Support Assistant and it could not answer this question:",
    "",
    `Question: ${question}`,
    "",
    answerMd ? `Assistant's reply: ${answerMd}` : "Assistant did not return an answer.",
    "",
    "Please help from here.",
  ].join("\n");
  const ticketUrl = buildTicketUrl(subject, transcript);

  return (
    <div className="kba-handoff">
      <div className="kba-handoff-icon"><AlertTriangle size={16} /></div>
      <div className="kba-handoff-body">
        <div className="kba-handoff-title">Let's get you a human.</div>
        <div className="kba-handoff-sub">
          I couldn't find a confident answer. Open a Zendesk ticket and your question + this chat
          will be pre-filled so you don't have to retype.
        </div>
        <div className="kba-handoff-actions">
          <a
            className="btn btn-primary"
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenTicket && onOpenTicket(turn?.turn_id || null)}
          >
            <ExternalLink size={13} /> Create a Zendesk ticket
          </a>
          <button className="btn btn-secondary" onClick={onDismiss}>Keep chatting</button>
        </div>
      </div>
    </div>
  );
}

// Internal chat shell used by both the hero (inline in the KB tab) and the
// floating bubble launcher. Keeps ALL assistant logic in one place.
function AssistantShell({ token, onOpenArticle, initialQuestion, compact, onClose }) {
  const [input, setInput] = useState(initialQuestion || "");
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingSources, setStreamingSources] = useState([]);
  const [handoff, setHandoff] = useState(null); // {turn, question, answerMd}
  const [conversationId] = useState(() => crypto.randomUUID?.() || `c-${Date.now()}`);
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, streamingText, handoff]);

  useEffect(() => {
    if (initialQuestion) setInput(initialQuestion);
  }, [initialQuestion]);

  const sendQuestion = useCallback(async (raw) => {
    const q = String(raw ?? input).trim();
    if (!q || streaming || !token) return;
    setInput("");
    setHandoff(null);
    const userMsg = { id: crypto.randomUUID?.() || `u-${Date.now()}`, role: "user", content: q };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamingText("");
    setStreamingSources([]);

    let accumulated = "";
    let finalSources = [];
    let needsHuman = false;
    let turnId = null;

    try {
      await streamKbAssistant(
        token,
        { question: q, conversation_id: conversationId, history },
        (evt) => {
          if (evt.type === "sources" && Array.isArray(evt.data)) {
            setStreamingSources(evt.data);
            finalSources = evt.data;
          } else if (evt.type === "delta" && typeof evt.data === "string") {
            accumulated += evt.data;
            setStreamingText(accumulated);
          } else if (evt.type === "done") {
            needsHuman = Boolean(evt.data?.needs_human);
            turnId = evt.data?.turn_id || null;
            if (Array.isArray(evt.data?.sources) && evt.data.sources.length) {
              finalSources = evt.data.sources;
            }
          } else if (evt.type === "error") {
            accumulated += "\n\n(Connection interrupted. Please try again.)";
            setStreamingText(accumulated);
          }
        }
      );
    } catch (err) {
      // Fallback to non-streaming path
      try {
        const resp = await askKbAssistant(token, { question: q, conversation_id: conversationId, history });
        accumulated = resp.answer_md || resp.reason || "";
        finalSources = resp.sources || [];
        needsHuman = Boolean(resp.needs_human);
        turnId = resp.turn_id || null;
      } catch (err2) {
        accumulated = "Sorry, something went wrong talking to the assistant. Try again in a moment, or open a ticket with support.";
        needsHuman = true;
      }
    }

    const assistantMsg = {
      id: crypto.randomUUID?.() || `a-${Date.now()}`,
      role: "assistant",
      content: accumulated,
      sources: finalSources,
      needs_human: needsHuman,
      turn_id: turnId,
    };
    setMessages(prev => [...prev, assistantMsg]);
    setStreaming(false);
    setStreamingText("");
    setStreamingSources([]);

    if (needsHuman) {
      setHandoff({ turn: { turn_id: turnId }, question: q, answerMd: accumulated });
    }
  }, [input, messages, streaming, token, conversationId]);

  const handleSubmit = (e) => { e.preventDefault(); sendQuestion(); };

  const onHandoffOpenTicket = async (turnId) => {
    if (!turnId) return;
    try { await handoffKbAssistantTurn(token, turnId); } catch { /* non-fatal */ }
  };

  const transcriptEmpty = messages.length === 0 && !streaming;

  return (
    <div className={`kba-shell ${compact ? "kba-shell--compact" : ""}`}>
      <div className="kba-header">
        <div className="kba-header-icon"><Sparkles size={16} /></div>
        <div className="kba-header-text">
          <div className="kba-header-title">Entrata Support Assistant</div>
          <div className="kba-header-sub">Grounded in the Entrata Help Center</div>
        </div>
        {onClose ? (
          <button className="kba-header-close" onClick={onClose} aria-label="Close assistant">
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="kba-transcript" ref={transcriptRef}>
        {transcriptEmpty ? (
          <div className="kba-empty">
            <Sparkles size={22} />
            <h4>Ask a question in plain English.</h4>
            <p>I'll search the Help Center and answer with the specific steps. If I'm not sure, I'll connect you to a human.</p>
            <div className="kba-suggestions">
              {[
                "How do I reverse a payment?",
                "Set up automatic late fees for a property",
                "Running a rent roll report",
                "What's new in the March release?",
              ].map(s => (
                <button key={s} type="button" className="kba-suggestion" onClick={() => sendQuestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map(m => (
          <div key={m.id} className={`kba-msg kba-msg--${m.role}`}>
            <div className="kba-msg-avatar">
              {m.role === "assistant" ? <Sparkles size={13} /> : <User size={13} />}
            </div>
            <div className="kba-msg-body">
              {m.role === "assistant" ? (
                <>
                  {m.content ? renderMd(m.content) : <em className="kba-muted">(no answer)</em>}
                  {Array.isArray(m.sources) && m.sources.length > 0 && !m.needs_human ? (
                    <div className="kba-sources">
                      <div className="kba-sources-label">Sources</div>
                      <div className="kba-sources-list">
                        {m.sources.slice(0, 4).map(s => (
                          <SourceChip key={s.slug} source={s} onClick={() => onOpenArticle && onOpenArticle(s.slug)} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="kba-msg-text">{m.content}</div>
              )}
            </div>
          </div>
        ))}

        {streaming ? (
          <div className="kba-msg kba-msg--assistant">
            <div className="kba-msg-avatar"><Sparkles size={13} /></div>
            <div className="kba-msg-body">
              {streamingText ? renderMd(streamingText) : (
                <div className="kba-typing">
                  <Loader2 size={14} className="kba-spin" />
                  <span>Searching the Help Center...</span>
                </div>
              )}
              {streamingSources.length > 0 ? (
                <div className="kba-sources kba-sources--streaming">
                  <div className="kba-sources-label">Reviewing</div>
                  <div className="kba-sources-list">
                    {streamingSources.slice(0, 4).map(s => (
                      <SourceChip key={`stream-${s.slug}`} source={s} onClick={() => onOpenArticle && onOpenArticle(s.slug)} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {handoff ? (
          <HandoffPanel
            turn={handoff.turn}
            question={handoff.question}
            answerMd={handoff.answerMd}
            onOpenTicket={(turnId) => onHandoffOpenTicket(turnId)}
            onDismiss={() => setHandoff(null)}
          />
        ) : null}
      </div>

      <form className="kba-composer" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask the Support Assistant..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim() || streaming}>
          <Send size={14} /> Send
        </button>
      </form>

      <div className="kba-footer">
        <span className="kba-footer-hint">Answers are grounded in Entrata Help Center articles. Double-check with the source before acting on critical workflows.</span>
        <a
          className="kba-footer-link"
          href={buildTicketUrl("Support question", "I want to talk to a human.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageSquare size={11} /> Open a Zendesk ticket
        </a>
      </div>
    </div>
  );
}

// Hero card variant: shows above the KB search bar. Expands inline on first
// use so the rest of the tab stays visible.
export function SupportAssistantHero({ token, onOpenArticle }) {
  const [expanded, setExpanded] = useState(false);
  const [prefill, setPrefill] = useState("");

  if (!expanded) {
    return (
      <div className="kba-hero">
        <div className="kba-hero-icon"><Sparkles size={20} /></div>
        <div className="kba-hero-body">
          <div className="kba-hero-title">Ask the Entrata Support Assistant</div>
          <div className="kba-hero-sub">Describe your issue in plain English. Grounded in 3,500+ Help Center articles, with a one-click hand-off to Zendesk when we can't answer.</div>
        </div>
        <form
          className="kba-hero-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!prefill.trim()) return;
            setExpanded(true);
          }}
        >
          <input
            type="text"
            placeholder='Try "How do I run a delinquency report?"'
            value={prefill}
            onChange={(e) => setPrefill(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!prefill.trim()}>
            <Send size={13} /> Ask
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="kba-hero kba-hero--expanded">
      <AssistantShell
        token={token}
        onOpenArticle={onOpenArticle}
        initialQuestion={prefill}
        onClose={() => { setExpanded(false); setPrefill(""); }}
      />
    </div>
  );
}

// Floating launcher anchored to bottom-right of the viewport. Opens the
// AssistantShell in a popover panel.
export function SupportAssistantBubble({ token, onOpenArticle }) {
  const [open, setOpen] = useState(false);
  if (!token) return null;

  return (
    <>
      <button
        type="button"
        className={`kba-bubble-launcher ${open ? "kba-bubble-launcher--hidden" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open Support Assistant"
      >
        <Sparkles size={16} />
        <span>Ask the Support Assistant</span>
      </button>
      {open ? (
        <div className="kba-bubble-panel">
          <AssistantShell
            token={token}
            onOpenArticle={(slug) => {
              if (onOpenArticle) onOpenArticle(slug);
              setOpen(false);
            }}
            compact
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}
