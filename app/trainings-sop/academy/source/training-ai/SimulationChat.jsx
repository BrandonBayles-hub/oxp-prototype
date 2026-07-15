import { useEffect, useRef, useState, useCallback } from "react";
import { MessageBubble } from "./MessageBubble.jsx";
import { TypingIndicator } from "./TypingIndicator.jsx";

const SpeechRecognition = typeof window !== "undefined"
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

function MicIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function SimulationChat({
  messages,
  input,
  setInput,
  onSend,
  sending,
  typing,
  propertyName,
  counterpartLabel
}) {
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const otherLabel = counterpartLabel || "Prospect";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleMic = useCallback(() => {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = input;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
        } else {
          interim += t;
        }
      }
      setInput(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, input, setInput]);

  return (
    <div className="tai-chat-panel">
      <div className="tai-chat-header">Simulation · {propertyName || "Property"}</div>
      <div className="tai-chat-messages">
        {messages.map((m) => (
          <MessageBubble
            key={m.id ?? `${m.role}-${m.content.slice(0, 12)}`}
            role={m.role}
            content={m.content}
            counterpartLabel={otherLabel}
          />
        ))}
        {typing ? <TypingIndicator label={`${otherLabel} is typing`} /> : null}
        <div ref={bottomRef} />
      </div>
      <div className="tai-input-row">
        <div className="tai-input-wrap">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening... speak now" : "Type or tap the mic to speak..."}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          {SpeechRecognition && (
            <button
              type="button"
              className={`tai-mic-btn${listening ? " tai-mic-active" : ""}`}
              onClick={toggleMic}
              disabled={sending}
              aria-label={listening ? "Stop recording" : "Start voice input"}
              title={listening ? "Stop recording" : "Voice input"}
            >
              <MicIcon active={listening} />
            </button>
          )}
        </div>
        <button type="button" className="btn-primary" disabled={sending || !input.trim()} onClick={onSend}>
          Send
        </button>
      </div>
    </div>
  );
}
