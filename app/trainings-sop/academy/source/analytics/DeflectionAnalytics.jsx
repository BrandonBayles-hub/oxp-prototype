import { useEffect, useState } from "react";
import { Sparkles, MessageCircle, AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { fetchKbAssistantAnalytics } from "../api";

const WINDOW_OPTIONS = [7, 30, 90];

function StatTile({ icon: Icon, label, value, sublabel, tone }) {
  return (
    <div className={`deflection-stat deflection-stat--${tone || "neutral"}`}>
      <div className="deflection-stat-icon"><Icon size={16} /></div>
      <div className="deflection-stat-body">
        <div className="deflection-stat-label">{label}</div>
        <div className="deflection-stat-value">{value}</div>
        {sublabel ? <div className="deflection-stat-sub">{sublabel}</div> : null}
      </div>
    </div>
  );
}

export function DeflectionAnalytics({ token }) {
  const [windowDays, setWindowDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchKbAssistantAnalytics(token, windowDays)
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, windowDays]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading deflection analytics...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ color: "var(--red-600, #dc2626)", fontSize: 13 }}>
          Failed to load analytics: {error}
        </div>
      </div>
    );
  }

  const total = data?.total || 0;
  const answered = data?.answered || 0;
  const handedOff = data?.handed_off || 0;
  const deflectionPct = typeof data?.deflection_rate === "number" ? data.deflection_rate : null;
  const latencyMs = data?.avg_latency_ms || 0;
  const byCategory = data?.by_category || [];

  return (
    <div className="deflection-analytics">
      <div className="deflection-header">
        <div>
          <h3 style={{ margin: 0 }}>Support Assistant deflection</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            How often the Support Assistant answers questions without a ticket needing a human.
            Each row represents a question asked in the Support Assistant.
          </p>
        </div>
        <div className="deflection-window">
          {WINDOW_OPTIONS.map(d => (
            <button
              key={d}
              className={`deflection-window-btn ${windowDays === d ? "active" : ""}`}
              onClick={() => setWindowDays(d)}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <Sparkles size={28} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <h4 style={{ margin: "0 0 4px" }}>No conversations yet in the last {windowDays} days.</h4>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            As staff use the Support Assistant from the Knowledge Base or floating launcher,
            deflection metrics will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="deflection-stats">
            <StatTile
              icon={MessageCircle}
              label="Questions asked"
              value={total.toLocaleString()}
              sublabel={`${windowDays}-day window`}
            />
            <StatTile
              icon={TrendingDown}
              tone={deflectionPct >= 70 ? "good" : deflectionPct >= 40 ? "warn" : "alert"}
              label="Deflection rate"
              value={deflectionPct != null ? `${deflectionPct}%` : "--"}
              sublabel={`${answered.toLocaleString()} answered in-app`}
            />
            <StatTile
              icon={AlertTriangle}
              tone={handedOff / Math.max(total, 1) > 0.4 ? "alert" : "neutral"}
              label="Handed off to Zendesk"
              value={handedOff.toLocaleString()}
              sublabel={`${total ? Math.round((handedOff / total) * 100) : 0}% of conversations`}
            />
            <StatTile
              icon={Clock}
              label="Avg response"
              value={latencyMs ? `${(latencyMs / 1000).toFixed(1)}s` : "--"}
              sublabel="Retrieval + generation"
            />
          </div>

          {byCategory.length > 0 ? (
            <div className="card" style={{ marginTop: 16, padding: 20 }}>
              <h4 style={{ margin: "0 0 12px" }}>By category</h4>
              <div className="deflection-table">
                <div className="deflection-table-header">
                  <span>Category</span>
                  <span>Questions</span>
                  <span>Answered</span>
                  <span>Handed off</span>
                  <span>Deflection</span>
                </div>
                {byCategory.map(row => {
                  const deflection = row.total
                    ? Math.round(((row.total - (row.handed_off || 0)) / row.total) * 100)
                    : 0;
                  return (
                    <div key={row.category} className="deflection-table-row">
                      <span className="deflection-category">{row.category}</span>
                      <span>{row.total.toLocaleString()}</span>
                      <span>{(row.answered || 0).toLocaleString()}</span>
                      <span>{(row.handed_off || 0).toLocaleString()}</span>
                      <span>
                        <span className="deflection-bar-shell">
                          <span
                            className={`deflection-bar deflection-bar--${deflection >= 70 ? "good" : deflection >= 40 ? "warn" : "alert"}`}
                            style={{ width: `${Math.min(100, Math.max(0, deflection))}%` }}
                          />
                        </span>
                        <span className="deflection-bar-label">{deflection}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
