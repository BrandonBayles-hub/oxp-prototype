export function MessageBubble({ role, content, counterpartLabel }) {
  const isTrainee = role === "trainee";
  return (
    <div className={`tai-bubble ${isTrainee ? "tai-bubble-trainee" : "tai-bubble-prospect"}`}>
      <div className="tai-bubble-role">{isTrainee ? "You" : (counterpartLabel || "Prospect")}</div>
      <div>{content}</div>
    </div>
  );
}
