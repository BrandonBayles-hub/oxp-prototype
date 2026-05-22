import { useEffect, useState } from "react";
import { Calendar, Video, MapPin, Users, Play, CheckCircle2, Clock } from "lucide-react";
import { fetchIltSessions, registerIltSession, unregisterIltSession } from "./api";

function formatWhen(start, end) {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    const time = `${s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    return `${date} at ${time}`;
  } catch { return start; }
}

export function ILTLearnerCard({ token }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchIltSessions(token, { upcoming: true });
      setSessions(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function handleRegister(id) {
    setPendingId(id);
    try { await registerIltSession(token, id); await load(); } finally { setPendingId(null); }
  }

  async function handleUnregister(id) {
    setPendingId(id);
    try { await unregisterIltSession(token, id); await load(); } finally { setPendingId(null); }
  }

  if (loading) return null;
  if (sessions.length === 0) return null;

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h2><Calendar size={14} /> Live Training Sessions</h2>
      </div>
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {sessions.map((s) => {
          const registered = s.my_status === "registered";
          const waitlisted = s.my_status === "waitlisted";
          const full = Number(s.registered_count) >= s.capacity;
          return (
            <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{s.course_title}</div>
              <div style={{ fontSize: 12, marginTop: 8, color: "#334155" }}>
                <Clock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                {formatWhen(s.start_time, s.end_time)}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: "#334155" }}>
                {s.session_type === "virtual" ? <><Video size={11} style={{ verticalAlign: -1, marginRight: 4 }} /> Virtual</> : <><MapPin size={11} style={{ verticalAlign: -1, marginRight: 4 }} /> {s.location}</>}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: "#334155" }}>
                <Users size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                {s.registered_count}/{s.capacity} registered{Number(s.waitlist_count) > 0 ? ` · ${s.waitlist_count} waitlisted` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {registered ? (
                  <>
                    {s.session_type === "virtual" && s.virtual_link ? (
                      <a className="btn-primary btn-sm" href={s.virtual_link} target="_blank" rel="noreferrer"><Play size={11} /> Join</a>
                    ) : null}
                    <button className="btn-sm" disabled={pendingId === s.id} onClick={() => handleUnregister(s.id)}>Cancel registration</button>
                    <span style={{ fontSize: 11, color: "var(--green-600)", fontWeight: 600, marginLeft: "auto", alignSelf: "center" }}><CheckCircle2 size={11} /> Registered</span>
                  </>
                ) : waitlisted ? (
                  <>
                    <button className="btn-sm" disabled={pendingId === s.id} onClick={() => handleUnregister(s.id)}>Leave waitlist</button>
                    <span style={{ fontSize: 11, color: "#9a3412", fontWeight: 600, marginLeft: "auto", alignSelf: "center" }}>Waitlisted</span>
                  </>
                ) : (
                  <button className="btn-primary btn-sm" disabled={pendingId === s.id || (full && !s.waitlist_enabled)} onClick={() => handleRegister(s.id)}>
                    {full ? (s.waitlist_enabled ? "Join waitlist" : "Session full") : "Register"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ILTLearnerCard;
