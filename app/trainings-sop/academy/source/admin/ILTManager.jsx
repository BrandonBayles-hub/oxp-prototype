import { useEffect, useState } from "react";
import { Calendar, Video, MapPin, Users, Plus, Trash2, CheckCircle2, X, Clock } from "lucide-react";
import { fetchIltSessions, fetchIltSession, createIltSession, deleteIltSession, markIltAttendance } from "../api";

function formatWhen(start, end) {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const time = `${s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - ${e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    return `${date} · ${time}`;
  } catch { return start; }
}

export function ILTManager({ token, courses }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    course_id: "",
    title: "",
    session_type: "virtual",
    virtual_link: "",
    location: "",
    start_time: "",
    end_time: "",
    capacity: 25,
    waitlist_enabled: true,
  });
  const [showForm, setShowForm] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState(null);
  const [attended, setAttended] = useState(new Set());
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const list = await fetchIltSessions(token);
      setSessions(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await createIltSession(token, {
        ...form,
        virtual_link: form.session_type === "virtual" ? form.virtual_link : null,
        location: form.session_type === "in_person" ? form.location : null,
      });
      setShowForm(false);
      setForm({ course_id: "", title: "", session_type: "virtual", virtual_link: "", location: "", start_time: "", end_time: "", capacity: 25, waitlist_enabled: true });
      await load();
    } catch (ex) {
      setError(ex.message || "Could not create session");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this session and unregister all learners?")) return;
    await deleteIltSession(token, id);
    await load();
  }

  async function openAttendance(session) {
    const detail = await fetchIltSession(token, session.id);
    setAttendanceSession(detail);
    const already = new Set(detail.roster.filter((r) => r.status === "attended").map((r) => r.user_id));
    setAttended(already);
  }

  async function saveAttendance() {
    if (!attendanceSession) return;
    await markIltAttendance(token, attendanceSession.id, Array.from(attended));
    setAttendanceSession(null);
    setAttended(new Set());
    await load();
  }

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2><Calendar size={15} /> Live Training (ILT / VILT)</h2>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Schedule Session</>}
          </button>
        </div>

        {showForm ? (
          <form onSubmit={handleCreate} style={{ padding: 16, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Course</span>
                <select required value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">Select a course...</option>
                  {(courses || []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Session title</span>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Live Q&A: Fair Housing" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Type</span>
                <select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}>
                  <option value="virtual">Virtual (Zoom/Teams)</option>
                  <option value="in_person">In-person</option>
                </select>
              </label>
              {form.session_type === "virtual" ? (
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Meeting link</span>
                  <input value={form.virtual_link} onChange={(e) => setForm({ ...form, virtual_link: e.target.value })} placeholder="https://zoom.us/j/..." />
                </label>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Location</span>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Training room, address" />
                </label>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Start</span>
                <input required type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>End</span>
                <input required type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Capacity</span>
                <input required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 20 }}>
                <input type="checkbox" checked={form.waitlist_enabled} onChange={(e) => setForm({ ...form, waitlist_enabled: e.target.checked })} />
                <span style={{ fontSize: 13 }}>Enable waitlist when full</span>
              </label>
            </div>
            {error ? <div style={{ padding: 8, color: "#991b1b", fontSize: 12 }}>{error}</div> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary"><Plus size={12} /> Create session</button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div style={{ padding: 20, color: "#737373" }}>Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state"><Calendar /><div className="empty-title">No live sessions scheduled</div><div className="empty-desc">Use Schedule Session to run a virtual or in-person class.</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Session</th><th>Course</th><th>When</th><th>Format</th><th>Registration</th><th>Actions</th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.title}</strong></td>
                    <td>{s.course_title}</td>
                    <td style={{ fontSize: 12 }}><Clock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{formatWhen(s.start_time, s.end_time)}</td>
                    <td>{s.session_type === "virtual" ? <><Video size={11} /> Virtual</> : <><MapPin size={11} /> {s.location}</>}</td>
                    <td>
                      <Users size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                      {s.registered_count}/{s.capacity}
                      {Number(s.waitlist_count) > 0 ? <span style={{ fontSize: 11, color: "#9a3412", marginLeft: 6 }}>+{s.waitlist_count} waitlist</span> : null}
                    </td>
                    <td>
                      <button className="btn-sm" onClick={() => openAttendance(s)}><CheckCircle2 size={11} /> Attendance</button>
                      <button className="btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(s.id)}><Trash2 size={11} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {attendanceSession ? (
        <div className="player-overlay" onClick={() => setAttendanceSession(null)} role="dialog" aria-modal="true">
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: "100%", margin: 16 }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2><CheckCircle2 size={15} /> Mark Attendance</h2>
              <button onClick={() => setAttendanceSession(null)}><X size={12} /></button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
                <strong>{attendanceSession.title}</strong> · {formatWhen(attendanceSession.start_time, attendanceSession.end_time)}
              </div>
              {attendanceSession.roster.length === 0 ? (
                <div style={{ color: "#737373", fontSize: 13 }}>No one registered for this session yet.</div>
              ) : (
                <div>
                  {attendanceSession.roster.map((r) => (
                    <label key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      <input
                        type="checkbox"
                        checked={attended.has(r.user_id)}
                        onChange={(e) => {
                          const next = new Set(attended);
                          if (e.target.checked) next.add(r.user_id); else next.delete(r.user_id);
                          setAttended(next);
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: "#737373" }}>{r.role} · {r.email}</div>
                      </div>
                      <span style={{ fontSize: 11, color: r.status === "waitlisted" ? "#9a3412" : "#737373" }}>{r.status}</span>
                    </label>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button onClick={() => setAttendanceSession(null)}>Cancel</button>
                <button className="btn-primary" onClick={saveAttendance}><CheckCircle2 size={12} /> Save attendance</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ILTManager;
