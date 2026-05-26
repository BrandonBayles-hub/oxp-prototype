/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect, useCallback } from "react";
import { fetchTeamAnalytics, fetchTeamComplianceSummary } from "../api";
import {
  Users, TrendingUp, AlertTriangle, Clock, ShieldCheck, Loader2, Download, BarChart3
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, BarChart, Bar, Cell
} from "recharts";

function fmtDate(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const BAR_COLORS = ["#3b82f6", "#16a34a", "#d97706", "#dc2626", "#6366f1", "#0d9488"];

export function ManagerDashboard({ token, isElite }) {
  const [analytics, setAnalytics] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("overview");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchTeamAnalytics(token),
      isElite ? fetchTeamComplianceSummary(token).catch(() => null) : Promise.resolve(null)
    ])
      .then(([a, c]) => { setAnalytics(a); setCompliance(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, isElite]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card"><div className="empty-state"><Loader2 className="animate-spin" /><div className="empty-title">Loading team analytics...</div></div></div>;
  if (!analytics) return <div className="card"><div className="empty-state"><AlertTriangle size={32} /><div className="empty-title">Failed to load team analytics</div></div></div>;

  const sm = analytics.summary;
  const completionRate = sm.total_enrollments > 0 ? Math.round((Number(sm.total_completed) / Number(sm.total_enrollments)) * 100) : 0;

  const exportTable = (rows, filename) => {
    if (!rows || rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Team Analytics</h2>
      </div>

      <div className="admin-subtabs" style={{ marginBottom: 16 }}>
        <button className={subTab === "overview" ? "active" : ""} onClick={() => setSubTab("overview")}><BarChart3 size={13} /> Overview</button>
        <button className={subTab === "courses" ? "active" : ""} onClick={() => setSubTab("courses")}><TrendingUp size={13} /> Course Performance</button>
        <button className={subTab === "at-risk" ? "active" : ""} onClick={() => setSubTab("at-risk")}><AlertTriangle size={13} /> At Risk</button>
        {isElite && <button className={subTab === "compliance" ? "active" : ""} onClick={() => setSubTab("compliance")}><ShieldCheck size={13} /> Compliance</button>}
        {analytics.property_comparison.length > 1 && (
          <button className={subTab === "properties" ? "active" : ""} onClick={() => setSubTab("properties")}><Users size={13} /> Properties</button>
        )}
      </div>

      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}><Users size={18} /></div>
          <div className="stat-value">{Number(sm.team_size)}</div>
          <div className="stat-label">Team Size</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}><TrendingUp size={18} /></div>
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}><Clock size={18} /></div>
          <div className="stat-value">{sm.avg_score != null ? `${sm.avg_score}%` : "--"}</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card" style={Number(sm.total_overdue) > 0 ? { borderLeft: "3px solid #dc2626" } : {}}>
          <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertTriangle size={18} /></div>
          <div className="stat-value" style={Number(sm.total_overdue) > 0 ? { color: "#dc2626" } : {}}>{Number(sm.total_overdue)}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      {subTab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Completions (12 weeks)</h3>
              {analytics.completion_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analytics.completion_trend.map(r => ({ ...r, week: fmtDate(r.week), completions: Number(r.completions) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <RTooltip />
                    <Area type="monotone" dataKey="completions" stroke="#3b82f6" fill="#3b82f680" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{ color: "#6b7280", fontSize: 14 }}>No completion data yet</div>}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>By Category</h3>
              {analytics.category_matrix.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.category_matrix.map(r => ({ ...r, total: Number(r.total), completed: Number(r.completed), overdue: Number(r.overdue) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" fontSize={11} angle={-20} textAnchor="end" height={50} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <RTooltip />
                    <Bar dataKey="completed" fill="#16a34a" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" fill="#dc2626" name="Overdue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ color: "#6b7280", fontSize: 14 }}>No category data</div>}
            </div>
          </div>
        </>
      )}

      {subTab === "courses" && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Course Performance</h3>
            <button className="btn-ghost btn-sm" onClick={() => exportTable(analytics.course_performance, "course-performance.csv")}><Download size={13} /> CSV</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Course</th>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <th style={{ textAlign: "right" }}>Enrolled</th>
                  <th style={{ textAlign: "right" }}>Completed</th>
                  <th style={{ textAlign: "right" }}>Rate</th>
                  <th style={{ textAlign: "right" }}>Avg Score</th>
                  <th style={{ textAlign: "right" }}>Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {analytics.course_performance.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{c.title}</td>
                    <td style={{ fontSize: 13, color: "#6b7280" }}>{c.category}</td>
                    <td style={{ textAlign: "right" }}>{Number(c.enrolled)}</td>
                    <td style={{ textAlign: "right" }}>{Number(c.completed)}</td>
                    <td style={{ textAlign: "right" }}>{c.enrolled > 0 ? Math.round((Number(c.completed) / Number(c.enrolled)) * 100) : 0}%</td>
                    <td style={{ textAlign: "right" }}>{c.avg_score != null ? `${c.avg_score}%` : "--"}</td>
                    <td style={{ textAlign: "right" }}>{c.avg_time_seconds ? `${Math.round(c.avg_time_seconds / 60)}m` : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "at-risk" && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>At-Risk Learners</h3>
            <button className="btn-ghost btn-sm" onClick={() => exportTable(analytics.at_risk_learners, "at-risk-learners.csv")}><Download size={13} /> CSV</button>
          </div>
          {analytics.at_risk_learners.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No at-risk learners. Everyone is on track!</div>
          ) : (
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Name</th>
                  <th style={{ textAlign: "left" }}>Role</th>
                  <th style={{ textAlign: "left" }}>Property</th>
                  <th style={{ textAlign: "right" }}>Overdue</th>
                  <th style={{ textAlign: "right" }}>Due This Week</th>
                </tr>
              </thead>
              <tbody>
                {analytics.at_risk_learners.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{l.name}</td>
                    <td style={{ fontSize: 13, color: "#6b7280" }}>{l.role}</td>
                    <td style={{ fontSize: 13, color: "#6b7280" }}>{l.property_name || "--"}</td>
                    <td style={{ textAlign: "right", color: Number(l.overdue_count) > 0 ? "#dc2626" : undefined, fontWeight: 600 }}>{Number(l.overdue_count)}</td>
                    <td style={{ textAlign: "right" }}>{Number(l.due_this_week)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === "compliance" && isElite && (
        <div>
          {!compliance ? (
            <div className="card" style={{ padding: 20 }}><div style={{ color: "#6b7280", fontSize: 14 }}>Compliance data unavailable</div></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Certification Status</h3>
                  <button className="btn-ghost btn-sm" onClick={() => exportTable(compliance.cert_status, "team-cert-status.csv")}><Download size={13} /> CSV</button>
                </div>
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Name</th>
                      <th style={{ textAlign: "left" }}>Role</th>
                      <th style={{ textAlign: "right" }}>Required</th>
                      <th style={{ textAlign: "right" }}>Current</th>
                      <th style={{ textAlign: "right" }}>Expiring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliance.cert_status.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</td>
                        <td style={{ fontSize: 13, color: "#6b7280" }}>{r.role}</td>
                        <td style={{ textAlign: "right" }}>{Number(r.required)}</td>
                        <td style={{ textAlign: "right", color: Number(r.current_certs) < Number(r.required) ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{Number(r.current_certs)}</td>
                        <td style={{ textAlign: "right", color: Number(r.expiring_soon) > 0 ? "#d97706" : undefined }}>{Number(r.expiring_soon)}</td>
                      </tr>
                    ))}
                    {compliance.cert_status.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#6b7280", fontSize: 14, padding: 20 }}>No certification requirements</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Policy Acknowledgments</h3>
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Policy</th>
                      <th style={{ textAlign: "right" }}>Ack'd</th>
                      <th style={{ textAlign: "right" }}>Pending</th>
                      <th style={{ textAlign: "right" }}>Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compliance.policy_status || []).map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500, fontSize: 14 }}>{p.title}</td>
                        <td style={{ textAlign: "right", color: "#16a34a" }}>{Number(p.acknowledged)}</td>
                        <td style={{ textAlign: "right" }}>{Number(p.pending)}</td>
                        <td style={{ textAlign: "right", color: Number(p.overdue) > 0 ? "#dc2626" : undefined, fontWeight: Number(p.overdue) > 0 ? 600 : 400 }}>{Number(p.overdue)}</td>
                      </tr>
                    ))}
                    {(!compliance.policy_status || compliance.policy_status.length === 0) && <tr><td colSpan={4} style={{ textAlign: "center", color: "#6b7280", fontSize: 14, padding: 20 }}>No policies assigned</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === "properties" && analytics.property_comparison.length > 1 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Property Comparison</h3>
            <button className="btn-ghost btn-sm" onClick={() => exportTable(analytics.property_comparison, "property-comparison.csv")}><Download size={13} /> CSV</button>
          </div>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Property</th>
                <th style={{ textAlign: "right" }}>Team</th>
                <th style={{ textAlign: "right" }}>Enrollments</th>
                <th style={{ textAlign: "right" }}>Completed</th>
                <th style={{ textAlign: "right" }}>Rate</th>
                <th style={{ textAlign: "right" }}>Overdue</th>
                <th style={{ textAlign: "right" }}>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {analytics.property_comparison.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, fontSize: 14 }}>{p.property_name}</td>
                  <td style={{ textAlign: "right" }}>{Number(p.team_size)}</td>
                  <td style={{ textAlign: "right" }}>{Number(p.total_enrollments)}</td>
                  <td style={{ textAlign: "right" }}>{Number(p.completed)}</td>
                  <td style={{ textAlign: "right" }}>{Number(p.total_enrollments) > 0 ? Math.round((Number(p.completed) / Number(p.total_enrollments)) * 100) : 0}%</td>
                  <td style={{ textAlign: "right", color: Number(p.overdue) > 0 ? "#dc2626" : undefined }}>{Number(p.overdue)}</td>
                  <td style={{ textAlign: "right" }}>{p.avg_score != null ? `${p.avg_score}%` : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
