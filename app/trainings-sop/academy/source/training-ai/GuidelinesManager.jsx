import { useCallback, useEffect, useState } from "react";
import {
  taiFetchGuidelines,
  taiCreateGuideline,
  taiUpdateGuideline,
  taiDeleteGuideline
} from "../api.js";

const CATEGORIES = [
  { value: "vocabulary", label: "Vocabulary / Terminology" },
  { value: "greeting", label: "Greeting / Opening" },
  { value: "closing", label: "Closing / Sign-off" },
  { value: "behavior", label: "Behavioral Expectation" },
  { value: "tone", label: "Tone / Brand Voice" },
  { value: "compliance", label: "Compliance / Legal" },
  { value: "custom", label: "Custom Rule" },
];

const SIM_TYPE_OPTIONS = [
  { value: "", label: "All simulation types" },
  { value: "leasing", label: "Leasing only" },
  { value: "maintenance", label: "Maintenance only" },
  { value: "property_management", label: "Property Management only" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "custom",
  simulation_type: "",
  severity: "required",
  examples: [{ wrong: "", correct: "" }],
};

export function GuidelinesManager({ token }) {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await taiFetchGuidelines(token);
      setGuidelines(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, examples: [{ wrong: "", correct: "" }] });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (g) => {
    setForm({
      title: g.title,
      description: g.description,
      category: g.category,
      simulation_type: g.simulation_type || "",
      severity: g.severity,
      examples: g.examples && g.examples.length ? g.examples : [{ wrong: "", correct: "" }],
    });
    setEditingId(g.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        simulation_type: form.simulation_type || null,
        examples: form.examples.filter(e => e.wrong || e.correct),
      };
      if (editingId) {
        await taiUpdateGuideline(token, editingId, payload);
      } else {
        await taiCreateGuideline(token, payload);
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (g) => {
    try {
      await taiUpdateGuideline(token, g.id, { active: !g.active });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (g) => {
    if (!confirm(`Delete guideline "${g.title}"?`)) return;
    try {
      await taiDeleteGuideline(token, g.id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const updateExample = (idx, field, value) => {
    setForm(prev => {
      const examples = [...prev.examples];
      examples[idx] = { ...examples[idx], [field]: value };
      return { ...prev, examples };
    });
  };

  const addExample = () => {
    setForm(prev => ({ ...prev, examples: [...prev.examples, { wrong: "", correct: "" }] }));
  };

  const removeExample = (idx) => {
    setForm(prev => ({ ...prev, examples: prev.examples.filter((_, i) => i !== idx) }));
  };

  const activeCount = guidelines.filter(g => g.active).length;

  return (
    <div className="tai-guidelines">
      <div className="tai-guidelines-header">
        <div>
          <h3 style={{ margin: 0 }}>Training Guidelines</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Define your brand voice, required terminology, and behavioral expectations.
            The AI will evaluate trainees against these rules and test compliance during simulations.
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
          + Add guideline
        </button>
      </div>

      {error ? (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          {error}
          <button type="button" className="btn-sm" style={{ marginLeft: 8 }} onClick={() => setError("")}>Dismiss</button>
        </div>
      ) : null}

      {showForm ? (
        <div className="tai-guideline-form card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>{editingId ? "Edit guideline" : "New guideline"}</h3>
          </div>

          <div className="tai-form-grid">
            <div className="tai-form-field">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder='e.g. "Use resident, not tenant"'
              />
            </div>

            <div className="tai-form-field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="tai-form-field" style={{ gridColumn: "1 / -1" }}>
              <label>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder='e.g. "Always refer to apartment occupants as residents, never tenants. This reflects our community-first brand."'
              />
            </div>

            <div className="tai-form-field">
              <label>Applies to</label>
              <select value={form.simulation_type} onChange={(e) => setForm(p => ({ ...p, simulation_type: e.target.value }))}>
                {SIM_TYPE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="tai-form-field">
              <label>Severity</label>
              <select value={form.severity} onChange={(e) => setForm(p => ({ ...p, severity: e.target.value }))}>
                <option value="required">Required (graded strictly)</option>
                <option value="preferred">Preferred (noted but not penalized)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
              Examples (wrong → correct)
            </label>
            {form.examples.map((ex, i) => (
              <div key={i} className="tai-example-row">
                <input
                  type="text"
                  value={ex.wrong}
                  onChange={(e) => updateExample(i, "wrong", e.target.value)}
                  placeholder="Wrong usage..."
                />
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>→</span>
                <input
                  type="text"
                  value={ex.correct}
                  onChange={(e) => updateExample(i, "correct", e.target.value)}
                  placeholder="Correct usage..."
                />
                {form.examples.length > 1 ? (
                  <button type="button" className="btn-sm btn-ghost" onClick={() => removeExample(i)} aria-label="Remove example">×</button>
                ) : null}
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addExample} style={{ marginTop: 4 }}>
              + Add example
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button type="button" className="btn-sm" onClick={() => { setShowForm(false); setEditingId(null); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading guidelines...</div>
      ) : guidelines.length === 0 ? (
        <div className="tai-empty-guidelines">
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p style={{ fontWeight: 600, margin: "0 0 4px" }}>No training guidelines yet</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
            Add guidelines to customize how the AI trains and evaluates your team.
          </p>
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>Create your first guideline</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
            {activeCount} active guideline{activeCount !== 1 ? "s" : ""} · {guidelines.length} total
          </div>
          <div className="tai-guidelines-list">
            {guidelines.map((g) => (
              <div key={g.id} className={`tai-guideline-card${g.active ? "" : " tai-guideline-inactive"}`}>
                <div className="tai-guideline-top">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{g.title}</span>
                      <span className={`tai-badge tai-badge-${g.severity}`}>{g.severity}</span>
                      <span className="tai-badge tai-badge-cat">{CATEGORIES.find(c => c.value === g.category)?.label || g.category}</span>
                      {g.simulation_type ? (
                        <span className="tai-badge tai-badge-sim">{g.simulation_type.replace(/_/g, " ")}</span>
                      ) : (
                        <span className="tai-badge tai-badge-sim">all types</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.4 }}>{g.description}</p>
                    {g.examples && g.examples.length > 0 && g.examples.some(e => e.wrong || e.correct) ? (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        {g.examples.filter(e => e.wrong || e.correct).map((e, i) => (
                          <span key={i} style={{ marginRight: 12 }}>
                            <span style={{ color: "#dc2626", textDecoration: "line-through" }}>{e.wrong}</span>
                            {e.wrong && e.correct ? " → " : ""}
                            <span style={{ color: "#16a34a" }}>{e.correct}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="tai-guideline-actions">
                    <button type="button" className="btn-sm" onClick={() => handleToggle(g)}>
                      {g.active ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="btn-sm" onClick={() => openEdit(g)}>Edit</button>
                    <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(g)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
