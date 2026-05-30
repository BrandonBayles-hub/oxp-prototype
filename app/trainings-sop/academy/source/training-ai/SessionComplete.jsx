import { SkillRadar } from "./SkillRadar.jsx";
import { ReadinessBadge } from "./ReadinessBadge.jsx";

export function SessionComplete({
  readiness,
  overallScore,
  skillSnapshot,
  skills,
  onTrainAgain,
  onClose
}) {
  return (
    <div className="tai-complete-overlay">
      <div className="tai-complete-card">
        <h2 style={{ marginTop: 0 }}>Session complete</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Autonomous readiness assessment from your cumulative performance (no manager grading).
        </p>
        <div style={{ margin: "16px 0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ReadinessBadge readiness={readiness} />
          {overallScore != null ? (
            <span style={{ fontSize: 14, fontWeight: 600 }}>Session avg (1-10 scale blend): {overallScore}</span>
          ) : null}
        </div>
        <SkillRadar skillMap={skillSnapshot} skills={skills} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
          <button type="button" className="btn-primary" onClick={onTrainAgain}>
            Train again
          </button>
          <button type="button" className="btn-sm" onClick={onClose}>
            Back to setup
          </button>
        </div>
      </div>
    </div>
  );
}
