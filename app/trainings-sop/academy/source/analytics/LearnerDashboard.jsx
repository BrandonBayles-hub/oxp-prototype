/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect } from "react";
import { fetchMyDashboard, API_BASE } from "../api";
import {
  CheckCircle2, Clock, AlertTriangle, Award, BookOpen, Download, Loader2,
  TrendingUp, Target, ShieldCheck
} from "lucide-react";
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip as RTooltip
} from "recharts";

function fmtDate(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtMins(seconds) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return d;
}

export function LearnerDashboard({ token, isElite }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    fetchMyDashboard(token).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="card"><div className="empty-state"><Loader2 className="animate-spin" /><div className="empty-title">Loading analytics...</div></div></div>;
  if (!data) return <div className="card"><div className="empty-state"><AlertTriangle size={32} /><div className="empty-title">Failed to load analytics</div></div></div>;

  const s = data.summary;
  const pct = s.total_assigned > 0 ? Math.round((Number(s.total_completed) / Number(s.total_assigned)) * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (circumference * pct / 100);

  const handleExportCsv = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/analytics/my-dashboard?format=csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await resp.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "my-learning-transcript.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>My Progress</h2>
        <button className="btn-outline btn-sm" onClick={handleExportCsv}><Download size={13} /> Export Transcript</button>
      </div>

      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ display: "flex", gap: 16, alignItems: "center", flex: "2 1 240px" }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#16a34a" strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" transform="rotate(-90 60 60)" />
            <text x="60" y="55" textAnchor="middle" fontSize="24" fontWeight="700" fill="#111">{pct}%</text>
            <text x="60" y="72" textAnchor="middle" fontSize="11" fill="#6b7280">complete</text>
          </svg>
          <div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>Courses Completed</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{Number(s.total_completed)}<span style={{ fontSize: 14, color: "#6b7280", fontWeight: 400 }}> / {Number(s.total_assigned)}</span></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}><Clock size={18} /></div>
          <div className="stat-value">{fmtMins(Number(s.total_time_seconds))}</div>
          <div className="stat-label">Hours Logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}><TrendingUp size={18} /></div>
          <div className="stat-value">{s.streak_weeks}</div>
          <div className="stat-label">Week Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}><Target size={18} /></div>
          <div className="stat-value">{s.avg_score != null ? `${s.avg_score}%` : "--"}</div>
          <div className="stat-label">Avg Score</div>
        </div>
        {Number(s.overdue) > 0 && (
          <div className="stat-card" style={{ borderLeft: "3px solid #dc2626" }}>
            <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertTriangle size={18} /></div>
            <div className="stat-value" style={{ color: "#dc2626" }}>{Number(s.overdue)}</div>
            <div className="stat-label">Overdue</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isElite && data.skill_profile.length > 0 ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            <Clock size={15} style={{ verticalAlign: -2 }} /> Upcoming Due Dates
          </h3>
          {data.upcoming_due.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No upcoming assignments. You're all caught up!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.upcoming_due.map(item => {
                const days = daysUntil(item.due_date);
                const urgent = days != null && days <= 3;
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: urgent ? "#fef2f2" : "#f9fafb" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{item.category}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: urgent ? "#dc2626" : "#374151" }}>
                        {days != null ? (days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `${days} days left`) : "--"}
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDate(item.due_date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isElite && data.skill_profile.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
              <Target size={15} style={{ verticalAlign: -2 }} /> Skill Radar
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={data.skill_profile.map(s => ({ skill: s.skill_name.replace(/_/g, " "), level: Number(s.current_level) }))}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" fontSize={11} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar dataKey="level" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                <RTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            <ShieldCheck size={15} style={{ verticalAlign: -2 }} /> Compliance Status
          </h3>
          {data.compliance.length === 0 && data.policy_status.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No compliance requirements for your role.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.compliance.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, background: "#f9fafb" }}>
                  <span style={{ fontSize: 14 }}>{c.course_title}</span>
                  <span className={`badge ${c.status === "valid" ? "badge-success" : c.status === "expiring_soon" ? "badge-warning" : "badge-danger"}`}>
                    {c.status === "valid" ? "Current" : c.status === "expiring_soon" ? "Expiring Soon" : c.status === "expired" ? "Expired" : "Missing"}
                  </span>
                </div>
              ))}
              {data.policy_status.map((p, i) => (
                <div key={`p-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, background: "#f9fafb" }}>
                  <span style={{ fontSize: 14 }}>{p.title}</span>
                  <span className={`badge ${p.status === "acknowledged" ? "badge-success" : p.status === "overdue" ? "badge-danger" : "badge-warning"}`}>
                    {p.status === "acknowledged" ? "Acknowledged" : p.status === "overdue" ? "Overdue" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
              <Award size={15} style={{ verticalAlign: -2 }} /> Recent Completions
            </h3>
            <button className="btn-ghost btn-sm" onClick={() => setTranscriptOpen(!transcriptOpen)}>
              {transcriptOpen ? "Show less" : "Show all"}
            </button>
          </div>
          {data.recent_completions.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No completions yet. Start a course to see your progress here.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(transcriptOpen ? data.recent_completions : data.recent_completions.slice(0, 5)).map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, background: "#f9fafb" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{c.category} -- {fmtDate(c.completed_at)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {c.score != null && <div style={{ fontSize: 14, fontWeight: 600 }}>{c.score}%</div>}
                    {c.certificate_number && <div style={{ fontSize: 11, color: "#16a34a" }}><Award size={10} /> Certified</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
