import { PersonaCard } from "./PersonaCard.jsx";

const DEFAULT_SKILLS = [
  "rapport",
  "product_knowledge",
  "objection_handling",
  "closing",
  "professionalism"
];

function barClass(level) {
  if (level < 40) return "weak";
  if (level < 70) return "mid";
  return "strong";
}

export function CoachingSidebar({
  persona,
  skillSnapshot,
  coachingNote,
  avgScore,
  turnCount,
  moveTowardClose,
  analyzing,
  skills,
  traineeLabel,
  brandCompliance
}) {
  const skillList = skills && skills.length ? skills : DEFAULT_SKILLS;
  const label = traineeLabel || "the consultant";
  const compliance = brandCompliance && brandCompliance.length ? brandCompliance : [];
  const hasViolations = compliance.some(c => c.status === "fail");

  return (
    <aside className={`tai-sidebar ${analyzing ? "pulse" : ""}`}>
      <PersonaCard persona={persona} />
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Skill levels (rolling)</div>
      {skillList.map((k) => {
        const v = Math.round(skillSnapshot?.[k] ?? 50);
        return (
          <div key={k} className={`tai-skill-bar ${barClass(v)}`}>
            <div className="tai-skill-label">
              <span>{k.replace(/_/g, " ")}</span>
              <span>{v}</span>
            </div>
            <div className="tai-skill-track">
              <div className="tai-skill-fill" style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}

      {compliance.length > 0 ? (
        <div className={`tai-brand-compliance${hasViolations ? " tai-brand-violations" : ""}`}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Brand compliance</div>
          {compliance.map((c, i) => (
            <div key={i} className={`tai-compliance-item tai-compliance-${c.status}`}>
              <span className="tai-compliance-icon">
                {c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "—"}
              </span>
              <div>
                <span style={{ fontWeight: 600, fontSize: 11 }}>{c.rule}</span>
                {c.detail ? <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>{c.detail}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {coachingNote ? (
        <div className="tai-coach-note">
          <strong>Coach tip</strong>
          {coachingNote}
        </div>
      ) : (
        <div className="tai-meta">Respond as {label}. You will get live feedback after each message.</div>
      )}
      <div className="tai-meta">
        Turn {turnCount}
        {avgScore != null ? ` · Avg score (session) ~${avgScore}` : ""}
        {moveTowardClose ? " · Conversation may be wrapping up soon." : ""}
      </div>
    </aside>
  );
}
