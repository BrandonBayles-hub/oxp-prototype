/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect } from "react";
import { fetchComplianceOverview, API_BASE } from "../api";
import {
  ShieldCheck, Loader2, AlertTriangle, Download, Clock, Building2
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Cell
} from "recharts";

function fmtDate(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const URGENCY_COLORS = { expired: "#dc2626", "30_days": "#f97316", "60_days": "#d97706", "90_days": "#eab308" };
const URGENCY_LABELS = { expired: "Expired", "30_days": "< 30 days", "60_days": "< 60 days", "90_days": "< 90 days" };

export function ComplianceOverview({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceOverview(token).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  const exportCsv = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/analytics/compliance-overview?format=csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await resp.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "compliance-overview.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  if (loading) return <div className="card"><div className="empty-state"><Loader2 className="animate-spin" /><div className="empty-title">Loading compliance data...</div></div></div>;
  if (!data) return <div className="card"><div className="empty-state"><AlertTriangle size={32} /><div className="empty-title">Failed to load compliance data</div></div></div>;

  const o = data.overall;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Compliance Overview</h2>
        <button className="btn-outline btn-sm" onClick={exportCsv}><Download size={13} /> Export</button>
      </div>

      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ flex: "2 1 200px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `conic-gradient(${Number(o.compliance_rate) >= 80 ? "#16a34a" : Number(o.compliance_rate) >= 50 ? "#d97706" : "#dc2626"} ${Number(o.compliance_rate) || 0}%, #e5e7eb 0)`,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
                {o.compliance_rate ?? 0}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#6b7280" }}>Compliance Rate</div>
              <div style={{ fontSize: 14 }}>{Number(o.fully_compliant)} of {Number(o.total_users_with_reqs)} users compliant</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}><ShieldCheck size={18} /></div>
          <div className="stat-value">{Number(o.fully_compliant)}</div>
          <div className="stat-label">Compliant</div>
        </div>
        <div className="stat-card" style={Number(o.non_compliant) > 0 ? { borderLeft: "3px solid #dc2626" } : {}}>
          <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertTriangle size={18} /></div>
          <div className="stat-value" style={Number(o.non_compliant) > 0 ? { color: "#dc2626" } : {}}>{Number(o.non_compliant)}</div>
          <div className="stat-label">Non-Compliant</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            <Clock size={15} style={{ verticalAlign: -2 }} /> Expiring Certifications
          </h3>
          {data.expiring_certs.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No certifications expiring in the next 90 days</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th style={{ textAlign: "left" }}>Course</th>
                    <th style={{ textAlign: "left" }}>Property</th>
                    <th style={{ textAlign: "left" }}>Expires</th>
                    <th style={{ textAlign: "left" }}>Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expiring_certs.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.course_title}</td>
                      <td>{c.property_name || "--"}</td>
                      <td>{fmtDate(c.expires_at)}</td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: URGENCY_COLORS[c.urgency] || "#6b7280", padding: "2px 8px", borderRadius: 10, background: `${URGENCY_COLORS[c.urgency] || "#6b7280"}15` }}>
                          {URGENCY_LABELS[c.urgency] || c.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            <ShieldCheck size={15} style={{ verticalAlign: -2 }} /> Policy Acknowledgment Rates
          </h3>
          {data.policy_compliance.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No published policies</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.policy_compliance.map(p => {
                const rate = Number(p.ack_rate) || 0;
                return (
                  <div key={p.id} style={{ padding: "8px 12px", borderRadius: 8, background: "#f9fafb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: rate >= 80 ? "#16a34a" : rate >= 50 ? "#d97706" : "#dc2626" }}>{rate}%</span>
                    </div>
                    <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${rate}%`, height: "100%", background: rate >= 80 ? "#16a34a" : rate >= 50 ? "#d97706" : "#dc2626", borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      <span>{Number(p.acknowledged)} ack'd</span>
                      <span>{Number(p.pending)} pending</span>
                      {Number(p.overdue) > 0 && <span style={{ color: "#dc2626" }}>{Number(p.overdue)} overdue</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          <Building2 size={15} style={{ verticalAlign: -2 }} /> Gaps by Property
        </h3>
        {data.gaps_by_property.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 14 }}>No compliance gaps detected</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, data.gaps_by_property.length * 40)}>
              <BarChart data={data.gaps_by_property.map(r => ({ ...r, gaps: Number(r.gaps), compliance_rate: Number(r.compliance_rate) }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="property_name" type="category" width={150} fontSize={12} />
                <RTooltip />
                <Bar dataKey="gaps" name="Gaps" fill="#dc2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <table className="data-table" style={{ width: "100%", marginTop: 16 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Property</th>
                  <th style={{ textAlign: "right" }}>Requirements</th>
                  <th style={{ textAlign: "right" }}>Met</th>
                  <th style={{ textAlign: "right" }}>Gaps</th>
                  <th style={{ textAlign: "right" }}>Compliance %</th>
                </tr>
              </thead>
              <tbody>
                {data.gaps_by_property.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{p.property_name}</td>
                    <td style={{ textAlign: "right" }}>{Number(p.total_requirements)}</td>
                    <td style={{ textAlign: "right" }}>{Number(p.met)}</td>
                    <td style={{ textAlign: "right", color: Number(p.gaps) > 0 ? "#dc2626" : undefined, fontWeight: Number(p.gaps) > 0 ? 600 : 400 }}>{Number(p.gaps)}</td>
                    <td style={{ textAlign: "right" }}>{p.compliance_rate ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
