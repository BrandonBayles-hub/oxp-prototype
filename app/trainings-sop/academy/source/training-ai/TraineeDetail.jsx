import { SkillRadar } from "./SkillRadar.jsx";
import { ReadinessBadge } from "./ReadinessBadge.jsx";

export function TraineeDetail({ data, onBack }) {
  const u = data?.user;
  const sessions = data?.sessions || [];
  const prof = data?.skill_profile || {};
  return (
    <div className="tai-root">
      <div className="tai-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>{u?.name || "Trainee"}</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{u?.email}</p>
        </div>
        <button type="button" className="btn-sm" onClick={onBack}>
          Team list
        </button>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Skill profile</h3>
        <SkillRadar skillMap={prof} />
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Sessions</h3>
        <div className="tai-table-wrap">
          <table className="tai-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Property</th>
                <th>Status</th>
                <th>Score</th>
                <th>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.started_at ? new Date(s.started_at).toLocaleString() : "—"}</td>
                  <td>{s.property_name}</td>
                  <td>{s.status}</td>
                  <td>{s.overall_score != null ? s.overall_score : "—"}</td>
                  <td>{s.readiness ? <ReadinessBadge readiness={s.readiness} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
