export function PersonaCard({ persona }) {
  if (!persona) return null;
  return (
    <div className="tai-persona">
      <h4>{persona.name || "Prospect"}</h4>
      <div>
        {persona.household ? <div>{persona.household}</div> : null}
        {persona.budget ? <div>Budget: {persona.budget}</div> : null}
        {persona.move_in_timeline ? <div>Timeline: {persona.move_in_timeline}</div> : null}
        {persona.personality ? <div style={{ marginTop: 6, color: "var(--text-secondary)" }}>{persona.personality}</div> : null}
      </div>
    </div>
  );
}
