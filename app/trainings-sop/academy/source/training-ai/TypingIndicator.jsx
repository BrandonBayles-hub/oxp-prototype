export function TypingIndicator({ label = "Prospect is typing" }) {
  return (
    <div className="tai-typing">
      <div className="tai-typing-dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <span>{label}</span>
    </div>
  );
}
