import { ReadinessBadge } from "./ReadinessBadge.jsx";

export function ManagerDashboard({ data, onSelectUser, onBack }) {
  const trainees = data?.trainees || [];
  const stats = data?.stats || {};
  return (
    <div className="tai-root">
      <div className="tai-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Training AI — Team readiness</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Populated from live simulations — no manual reports.
          </p>
        </div>
        <button type="button" className="btn-sm" onClick={onBack}>
          Back
        </button>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.total_trainees ?? 0}</div>
          <div className="stat-label">Team members</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.ready_count ?? 0}</div>
          <div className="stat-label">Ready / exceptional</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.team_avg != null ? stats.team_avg : "—"}</div>
          <div className="stat-label">Team avg score</div>
        </div>
      </div>
      <div className="card">
        <div className="tai-table-wrap">
          <table className="tai-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Sessions</th>
                <th>Avg score</th>
                <th>Readiness</th>
                <th>Weakest skill</th>
              </tr>
            </thead>
            <tbody>
              {trainees.map((row) => (
                <tr key={row.user.id}>
                  <td>
                    <button
                      type="button"
                      className="btn-sm"
                      style={{ fontWeight: 600 }}
                      onClick={() => onSelectUser(row.user.id)}
                    >
                      {row.user.name}
                    </button>
                  </td>
                  <td>{row.user.role}</td>
                  <td>{row.sessions_completed}</td>
                  <td>{row.avg_score != null ? row.avg_score : "—"}</td>
                  <td>{row.readiness ? <ReadinessBadge readiness={row.readiness} /> : "—"}</td>
                  <td style={{ textTransform: "capitalize" }}>{row.weakest_skill?.replace(/_/g, " ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
