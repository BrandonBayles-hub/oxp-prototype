import { useState, useEffect } from "react";
import { fetchAdminAnalyticsOverview, fetchCompletionRate } from "../api";
import {
  Users, TrendingUp, AlertTriangle, CheckCircle2, BookOpen, Loader2, Download, BarChart3
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend
} from "recharts";

function fmtDate(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PIE_COLORS = ["#16a34a", "#3b82f6", "#d97706", "#dc2626", "#6366f1"];
const BAR_COLORS = ["#3b82f6", "#16a34a", "#d97706", "#6366f1", "#0d9488", "#dc2626", "#f59e0b", "#8b5cf6"];

export function AdminOverview({ token }) {
  const [data, setData] = useState(null);
  const [completionByProp, setCompletionByProp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("property");

  useEffect(() => {
    Promise.all([
      fetchAdminAnalyticsOverview(token),
      fetchCompletionRate(token, "property")
    ])
      .then(([d, cr]) => { setData(d); setCompletionByProp(cr); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchCompletionRate(token, groupBy).then(setCompletionByProp).catch(console.error);
  }, [token, groupBy]);

  if (loading) return <div className="card"><div className="empty-state"><Loader2 className="animate-spin" /><div className="empty-title">Loading org analytics...</div></div></div>;
  if (!data) return <div className="card"><div className="empty-state"><AlertTriangle size={32} /><div className="empty-title">Failed to load org analytics</div></div></div>;

  const k = data.kpis;
  const completionRate = Number(k.total_enrollments) > 0 ? Math.round((Number(k.total_completed) / Number(k.total_enrollments)) * 100) : 0;

  const exportOverview = () => {
    const rows = data.property_rankings.map(r => ({
      Property: r.property_name, Total: r.total, Completed: r.completed, "Completion %": r.completion_rate
    }));
    const keys = Object.keys(rows[0] || {});
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "org-overview.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Org Analytics</h2>
        <button className="btn-outline btn-sm" onClick={exportOverview}><Download size={13} /> Export</button>
      </div>

      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}><Users size={18} /></div>
          <div className="stat-value">{Number(k.total_users)}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}><TrendingUp size={18} /></div>
          <div className="stat-value">{Number(k.active_learners)}</div>
          <div className="stat-label">Active (30d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f3e8ff", color: "#7c3aed" }}><CheckCircle2 size={18} /></div>
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}><BookOpen size={18} /></div>
          <div className="stat-value">{k.avg_score != null ? `${k.avg_score}%` : "--"}</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card" style={Number(k.total_overdue) > 0 ? { borderLeft: "3px solid #dc2626" } : {}}>
          <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertTriangle size={18} /></div>
          <div className="stat-value" style={Number(k.total_overdue) > 0 ? { color: "#dc2626" } : {}}>{Number(k.total_overdue)}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}><BookOpen size={18} /></div>
          <div className="stat-value">{Number(k.published_courses)}</div>
          <div className="stat-label">Courses</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Engagement Trend (12 weeks)</h3>
          {data.engagement_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.engagement_trend.map(r => ({ ...r, week: fmtDate(r.week), active_learners: Number(r.active_learners), completions: Number(r.completions) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Line type="monotone" dataKey="active_learners" stroke="#3b82f6" strokeWidth={2} dot={false} name="Active Learners" />
                <Line type="monotone" dataKey="completions" stroke="#16a34a" strokeWidth={2} dot={false} name="Completions" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{ color: "#6b7280", fontSize: 14 }}>No engagement data yet</div>}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Enrollment Status</h3>
          {data.status_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.status_distribution.map(r => ({ ...r, count: Number(r.count), name: r.status }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                  {data.status_distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: "#6b7280", fontSize: 14 }}>No enrollment data</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Completion Rate by</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {["property", "region", "state"].map(g => (
              <button key={g} className={`btn-sm ${groupBy === g ? "btn-primary" : "btn-ghost"}`} onClick={() => setGroupBy(g)} style={{ textTransform: "capitalize" }}>{g}</button>
            ))}
          </div>
        </div>
        {completionByProp.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={completionByProp.map(r => ({ ...r, completion_rate: Number(r.completion_rate), dimension: r.dimension || "Unknown" }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} fontSize={12} tickFormatter={v => `${v}%`} />
              <YAxis dataKey="dimension" type="category" width={140} fontSize={12} />
              <RTooltip formatter={v => `${v}%`} />
              <Bar dataKey="completion_rate" name="Completion %" radius={[0, 4, 4, 0]}>
                {completionByProp.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div style={{ color: "#6b7280", fontSize: 14 }}>No data for this grouping</div>}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Property Rankings</h3>
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Property</th>
              <th style={{ textAlign: "right" }}>Enrollments</th>
              <th style={{ textAlign: "right" }}>Completed</th>
              <th style={{ textAlign: "right" }}>Completion %</th>
            </tr>
          </thead>
          <tbody>
            {data.property_rankings.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500, fontSize: 14 }}>{p.property_name || "Unassigned"}</td>
                <td style={{ textAlign: "right" }}>{Number(p.total)}</td>
                <td style={{ textAlign: "right" }}>{Number(p.completed)}</td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${p.completion_rate || 0}%`, height: "100%", background: Number(p.completion_rate) >= 80 ? "#16a34a" : Number(p.completion_rate) >= 50 ? "#d97706" : "#dc2626", borderRadius: 3 }} />
                    </div>
                    {p.completion_rate || 0}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
