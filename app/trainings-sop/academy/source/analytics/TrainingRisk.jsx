import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck, TrendingDown, Building2, Users, Info } from "lucide-react";
import { API_BASE, apiRequest } from "../api";

const BUCKET_COLORS = {
  low: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", label: "Low" },
  medium: { bg: "#fefce8", border: "#fde68a", text: "#854d0e", label: "Medium" },
  high: { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412", label: "High" },
  critical: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", label: "Critical" },
};

function BucketPill({ bucket, value }) {
  const cfg = BUCKET_COLORS[bucket] || BUCKET_COLORS.low;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 10, background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}{typeof value === "number" ? ` · ${value}` : ""}
    </span>
  );
}

export function TrainingRisk({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest("/api/admin/analytics/training-risk", {}, token)
      .then((r) => { if (!cancelled) { setData(r); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || "Failed to load"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [token]);

  const roles = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.rows.map((r) => r.role));
    return Array.from(set).sort();
  }, [data]);

  if (loading) return <div style={{ padding: 20 }}>Loading training risk...</div>;
  if (error) return <div className="alert alert-error" style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#991b1b" }}>{error}</div>;
  if (!data) return null;

  const rowsByProperty = new Map();
  for (const r of data.rows) {
    if (!rowsByProperty.has(r.property_id)) rowsByProperty.set(r.property_id, new Map());
    rowsByProperty.get(r.property_id).set(r.role, r);
  }

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "#737373", textTransform: "uppercase", letterSpacing: 0.4 }}>Portfolio risk</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{data.total_risk}</div>
          <div style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>weighted score across all properties & roles</div>
        </div>
        <div className="card" style={{ padding: 14, background: "#fef2f2", border: "1px solid #fecaca" }}>
          <div style={{ fontSize: 11, color: "#991b1b", textTransform: "uppercase", letterSpacing: 0.4 }}>Critical cells</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: "#991b1b" }}>{data.critical_count}</div>
          <div style={{ fontSize: 11, color: "#991b1b", marginTop: 2 }}>property x role combinations</div>
        </div>
        <div className="card" style={{ padding: 14, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontSize: 11, color: "#9a3412", textTransform: "uppercase", letterSpacing: 0.4 }}>High cells</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: "#9a3412" }}>{data.high_count}</div>
          <div style={{ fontSize: 11, color: "#9a3412", marginTop: 2 }}>require intervention this week</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "#737373", textTransform: "uppercase", letterSpacing: 0.4 }}>Properties at risk</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{data.properties.filter((p) => p.risk_bucket === "critical" || p.risk_bucket === "high").length}</div>
          <div style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>of {data.properties.length} total</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2><AlertTriangle size={15} /> Property x Role Risk Heatmap</h2>
          <div style={{ fontSize: 11, color: "#737373", display: "flex", alignItems: "center", gap: 6 }}>
            <Info size={12} /> weights: overdue compliance x3, expired certs x4, overdue policies x2, overdue product x1, trend delta x2
          </div>
        </div>
        <div style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", position: "sticky", left: 0, background: "#f9fafb" }}>Property</th>
                {roles.map((r) => (
                  <th key={r} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>{r}</th>
                ))}
                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.properties.map((p) => {
                const roleMap = rowsByProperty.get(p.property_id) || new Map();
                return (
                  <tr key={p.property_id} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} onClick={() => setSelectedProperty(p)}>
                    <td style={{ padding: "8px 12px", position: "sticky", left: 0, background: "#fff", fontWeight: 500 }}>
                      <Building2 size={12} style={{ verticalAlign: -1, color: "#737373", marginRight: 6 }} />
                      {p.property_name}
                      <span style={{ fontSize: 11, color: "#737373", marginLeft: 6 }}>({p.state})</span>
                    </td>
                    {roles.map((role) => {
                      const cell = roleMap.get(role);
                      if (!cell) return <td key={role} style={{ padding: "6px", textAlign: "center", color: "#cbd5e1" }}>&mdash;</td>;
                      const cfg = BUCKET_COLORS[cell.risk_bucket];
                      return (
                        <td key={role} style={{ padding: "6px", textAlign: "center" }}>
                          <div title={`${cell.user_count} users · ${cell.overdue_compliance} overdue compliance · ${cell.expired_certs} expired certs · ${cell.overdue_policies} overdue policies`} style={{ display: "inline-block", minWidth: 44, padding: "4px 8px", borderRadius: 6, background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, fontWeight: 700 }}>
                            {cell.risk_score}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <BucketPill bucket={p.risk_bucket} value={p.risk_score} />
                    </td>
                  </tr>
                );
              })}
              {data.properties.length === 0 ? (
                <tr><td colSpan={roles.length + 2} style={{ padding: 20, textAlign: "center", color: "#737373" }}>No risk data. Great news -- everyone is on track.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header"><h2><TrendingDown size={15} /> Top Overdue Drivers</h2></div>
        <div style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>User</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Role</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Property</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Course</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Category</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Days overdue</th>
              </tr>
            </thead>
            <tbody>
              {data.top_overdue.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px" }}>{r.user_name}</td>
                  <td style={{ padding: "8px 12px" }}>{r.role}</td>
                  <td style={{ padding: "8px 12px" }}>{r.property_name}</td>
                  <td style={{ padding: "8px 12px" }}>{r.course_title}</td>
                  <td style={{ padding: "8px 12px" }}>{r.category}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: r.days_overdue > 30 ? "#991b1b" : "#9a3412" }}>{r.days_overdue}</td>
                </tr>
              ))}
              {data.top_overdue.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#737373" }}>No overdue enrollments.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProperty ? (
        <div className="player-overlay" onClick={() => setSelectedProperty(null)} role="dialog" aria-modal="true">
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: "100%", margin: 16 }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2><Building2 size={15} /> {selectedProperty.property_name}</h2>
              <button onClick={() => setSelectedProperty(null)}>Close</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <BucketPill bucket={selectedProperty.risk_bucket} value={selectedProperty.risk_score} />
                <span style={{ fontSize: 12, color: "#737373" }}><Users size={12} style={{ verticalAlign: -1 }} /> {selectedProperty.user_count} users across {selectedProperty.roles} roles</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "8px", textAlign: "left" }}>Role</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Overdue compliance</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Expired certs</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Overdue policies</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from((rowsByProperty.get(selectedProperty.property_id) || new Map()).values()).map((c) => (
                    <tr key={c.role} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px" }}>{c.role}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{c.overdue_compliance}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{c.expired_certs}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{c.overdue_policies}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}><BucketPill bucket={c.risk_bucket} value={c.risk_score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TrainingRisk;
