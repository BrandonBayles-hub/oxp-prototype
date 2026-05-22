import { useState, useEffect } from "react";
import { TrendingUp, Building2, Wrench, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, LineChart, Line } from "recharts";
import { fetchOutcomesDashboard } from "../api";

export function OutcomesDashboard({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const d = await fetchOutcomesDashboard(token);
        setData(d);
      } catch (e) {
        console.error("Outcomes:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) return <div className="empty-state"><div className="empty-title">Loading outcome data...</div></div>;
  if (!data) return <div className="empty-state"><AlertTriangle /><div className="empty-title">Failed to load outcomes</div></div>;

  const { property_scatter = [], time_series = [], insights = [] } = data;

  return (
    <div>
      <div className="card mb-4" style={{ padding: 16 }}>
        <h2 style={{ margin: "0 0 4px" }}><TrendingUp size={18} style={{ verticalAlign: -3 }} /> Training-to-Outcome Correlation</h2>
        <p className="text-muted text-sm" style={{ margin: 0 }}>Unique to Entrata: correlating LMS training completion with operational business outcomes from the PMS.</p>
      </div>

      {insights.length > 0 && (
        <div className="stats-row mb-4">
          {insights.map((ins, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon ${i === 0 ? "green" : "blue"}`}><TrendingUp /></div>
              <div>
                <div className="stat-value">{ins.value}</div>
                <div className="stat-label">{ins.label}</div>
                <div className="text-muted text-sm" style={{ marginTop: 2 }}>{ins.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid two mb-4">
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px" }}><Building2 size={15} style={{ verticalAlign: -2 }} /> Training Completion vs Lease Conversion</h3>
          <p className="text-muted text-sm" style={{ margin: "0 0 12px" }}>Each dot is a property. Higher training = higher lease conversion.</p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="training_pct" name="Training %" unit="%" label={{ value: "Training Completion %", position: "bottom", offset: 5 }} />
              <YAxis dataKey="lease_conversion" name="Lease %" unit="%" label={{ value: "Lease Conversion %", angle: -90, position: "insideLeft" }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(val, name) => [`${val}%`, name]} labelFormatter={(_, payload) => payload?.[0]?.payload?.property || ""} />
              <Scatter data={property_scatter} fill="var(--primary)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px" }}><Wrench size={15} style={{ verticalAlign: -2 }} /> Training vs Work Order Resolution Time</h3>
          <p className="text-muted text-sm" style={{ margin: "0 0 12px" }}>More training correlates with faster work order resolution.</p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="training_pct" name="Training %" unit="%" label={{ value: "Training Completion %", position: "bottom", offset: 5 }} />
              <YAxis dataKey="wo_resolution_hours" name="WO Hours" unit="h" label={{ value: "Avg Resolution (hours)", angle: -90, position: "insideLeft" }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(val, name) => [name.includes("Hours") ? `${val}h` : `${val}%`, name]} labelFormatter={(_, payload) => payload?.[0]?.payload?.property || ""} />
              <Scatter data={property_scatter} fill="var(--warning)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: "0 0 12px" }}>Trend Over Time (6 Months)</h3>
        <p className="text-muted text-sm" style={{ margin: "0 0 12px" }}>Portfolio-wide averages showing training adoption driving operational improvement.</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={time_series} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={(v) => { const d = new Date(v); return d.toLocaleString("en", { month: "short", year: "2-digit" }); }} />
            <YAxis yAxisId="left" unit="%" />
            <YAxis yAxisId="right" orientation="right" unit="h" />
            <Tooltip labelFormatter={(v) => { const d = new Date(v); return d.toLocaleString("en", { month: "long", year: "numeric" }); }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avg_training" name="Avg Training %" stroke="var(--primary)" strokeWidth={2} dot />
            <Line yAxisId="left" type="monotone" dataKey="avg_lease_conversion" name="Avg Lease Conversion %" stroke="var(--success)" strokeWidth={2} dot />
            <Line yAxisId="right" type="monotone" dataKey="avg_wo_hours" name="Avg WO Resolution (hrs)" stroke="var(--warning)" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card mt-4" style={{ padding: 16 }}>
        <h3 style={{ margin: "0 0 12px" }}>Property Detail</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Property</th><th style={{ textAlign: "right" }}>Training %</th><th style={{ textAlign: "right" }}>Lease Conversion</th><th style={{ textAlign: "right" }}>WO Resolution</th></tr></thead>
            <tbody>
              {property_scatter.map((p, i) => (
                <tr key={i}>
                  <td><strong>{p.property}</strong></td>
                  <td style={{ textAlign: "right" }}>
                    <div className="progress-bar" style={{ width: 80, display: "inline-block", marginRight: 8, verticalAlign: "middle" }}>
                      <div className={`fill ${p.training_pct >= 80 ? "green" : p.training_pct >= 60 ? "blue" : "red"}`} style={{ width: `${p.training_pct}%` }} />
                    </div>
                    {p.training_pct}%
                  </td>
                  <td style={{ textAlign: "right" }}>{p.lease_conversion}%</td>
                  <td style={{ textAlign: "right" }}>{p.wo_resolution_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
