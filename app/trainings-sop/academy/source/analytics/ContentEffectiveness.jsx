import { useState, useEffect, Fragment } from "react";
import { fetchContentEffectiveness, fetchCourseEnrollmentUsers, API_BASE } from "../api";
import {
  BookOpen, Loader2, AlertTriangle, Download, Star, ArrowUpDown, ChevronDown, ChevronRight, Zap
} from "lucide-react";

function fmtDate(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ContentEffectiveness({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("enrolled");
  const [sortDir, setSortDir] = useState("desc");
  const [filterCategory, setFilterCategory] = useState("All");
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [courseUsers, setCourseUsers] = useState([]);
  const [courseUsersLoading, setCourseUsersLoading] = useState(false);
  const [tab, setTab] = useState("courses");

  useEffect(() => {
    fetchContentEffectiveness(token).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleExpand = async (courseId) => {
    if (expandedCourse === courseId) { setExpandedCourse(null); return; }
    setExpandedCourse(courseId);
    setCourseUsersLoading(true);
    try {
      const users = await fetchCourseEnrollmentUsers(token, courseId);
      setCourseUsers(users);
    } catch { setCourseUsers([]); }
    setCourseUsersLoading(false);
  };

  const exportCsv = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/analytics/content-effectiveness?format=csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await resp.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "content-effectiveness.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  if (loading) return <div className="card"><div className="empty-state"><Loader2 className="animate-spin" /><div className="empty-title">Loading content analytics...</div></div></div>;
  if (!data) return <div className="card"><div className="empty-state"><AlertTriangle size={32} /><div className="empty-title">Failed to load content analytics</div></div></div>;

  const categories = ["All", ...new Set(data.courses.map(c => c.category).filter(Boolean))];
  const filtered = data.courses
    .filter(c => filterCategory === "All" || c.category === filterCategory)
    .sort((a, b) => {
      const av = Number(a[sortField]) || 0;
      const bv = Number(b[sortField]) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });

  const SortHeader = ({ field, label, align = "right" }) => (
    <th style={{ textAlign: align, cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort(field)}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <ArrowUpDown size={11} style={{ opacity: sortField === field ? 1 : 0.3 }} />
      </span>
    </th>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Content Effectiveness</h2>
        <button className="btn-outline btn-sm" onClick={exportCsv}><Download size={13} /> Export CSV</button>
      </div>

      <div className="admin-subtabs" style={{ marginBottom: 16 }}>
        <button className={tab === "courses" ? "active" : ""} onClick={() => setTab("courses")}><BookOpen size={13} /> Courses</button>
        <button className={tab === "sparks" ? "active" : ""} onClick={() => setTab("sparks")}><Zap size={13} /> Spotlights</button>
      </div>

      {tab === "courses" && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {categories.map(c => (
              <button key={c} className={`btn-sm ${filterCategory === c ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilterCategory(c)}>{c}</button>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: 30 }}></th>
                  <th style={{ textAlign: "left" }}>Course</th>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <SortHeader field="enrolled" label="Enrolled" />
                  <SortHeader field="completed" label="Completed" />
                  <SortHeader field="completion_rate" label="Rate" />
                  <SortHeader field="avg_score" label="Avg Score" />
                  <SortHeader field="avg_time_seconds" label="Avg Time" />
                  <SortHeader field="avg_rating" label="Rating" />
                  <SortHeader field="overdue" label="Overdue" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <Fragment key={c.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => handleExpand(c.id)}>
                      <td>{expandedCourse === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td style={{ fontWeight: 500, fontSize: 14 }}>{c.title}</td>
                      <td style={{ fontSize: 13, color: "#6b7280" }}>{c.category}</td>
                      <td style={{ textAlign: "right" }}>{Number(c.enrolled)}</td>
                      <td style={{ textAlign: "right" }}>{Number(c.completed)}</td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ color: Number(c.completion_rate) >= 80 ? "#16a34a" : Number(c.completion_rate) >= 50 ? "#d97706" : "#dc2626", fontWeight: 600 }}>
                          {c.completion_rate ?? 0}%
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>{c.avg_score != null ? `${c.avg_score}%` : "--"}</td>
                      <td style={{ textAlign: "right" }}>{c.avg_time_seconds ? `${Math.round(c.avg_time_seconds / 60)}m` : "--"}</td>
                      <td style={{ textAlign: "right" }}>
                        {c.avg_rating ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                            <Star size={12} fill="#f59e0b" stroke="#f59e0b" /> {c.avg_rating}
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>({c.rating_count})</span>
                          </span>
                        ) : "--"}
                      </td>
                      <td style={{ textAlign: "right", color: Number(c.overdue) > 0 ? "#dc2626" : undefined }}>{Number(c.overdue)}</td>
                    </tr>
                    {expandedCourse === c.id && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={10} style={{ background: "#f9fafb", padding: "12px 20px" }}>
                          {courseUsersLoading ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280" }}><Loader2 size={14} className="animate-spin" /> Loading learner details...</div>
                          ) : courseUsers.length === 0 ? (
                            <div style={{ color: "#6b7280", fontSize: 14 }}>No enrollments for this course</div>
                          ) : (
                            <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: "left" }}>Learner</th>
                                  <th style={{ textAlign: "left" }}>Status</th>
                                  <th style={{ textAlign: "right" }}>Progress</th>
                                  <th style={{ textAlign: "right" }}>Score</th>
                                  <th style={{ textAlign: "left" }}>Due Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {courseUsers.map(u => (
                                  <tr key={u.user_id || u.id}>
                                    <td>{u.user_name || u.name}</td>
                                    <td>
                                      <span className={`badge ${u.status === "completed" ? "badge-success" : u.status === "in_progress" ? "badge-info" : "badge-warning"}`}>
                                        {u.status}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>{u.progress ?? 0}%</td>
                                    <td style={{ textAlign: "right" }}>{u.score != null ? `${u.score}%` : "--"}</td>
                                    <td>{fmtDate(u.due_date)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: "center", color: "#6b7280", fontSize: 14, padding: 20 }}>No courses match the filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "sparks" && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Spotlight Effectiveness</h3>
          {data.sparks.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No published spotlights yet</div>
          ) : (
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Spotlight</th>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <th style={{ textAlign: "right" }}>Assigned</th>
                  <th style={{ textAlign: "right" }}>Viewed</th>
                  <th style={{ textAlign: "right" }}>Completed</th>
                  <th style={{ textAlign: "right" }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.sparks.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{s.title}</td>
                    <td style={{ fontSize: 13, color: "#6b7280" }}>{s.category}</td>
                    <td style={{ textAlign: "right" }}>{Number(s.assigned)}</td>
                    <td style={{ textAlign: "right" }}>{Number(s.viewed)}</td>
                    <td style={{ textAlign: "right" }}>{Number(s.completed)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: Number(s.completion_rate) >= 80 ? "#16a34a" : "#d97706" }}>{s.completion_rate ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
