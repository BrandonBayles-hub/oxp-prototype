export function SessionSetup({
  properties,
  propertyId,
  setPropertyId,
  onStart,
  starting,
  error,
  simTypesInfo,
  selectedSimType,
  setSelectedSimType
}) {
  const canChoose = simTypesInfo?.canChoose;
  const types = simTypesInfo?.types || [];
  const activeType = types.find((t) => t.key === selectedSimType) || types[0];

  return (
    <div className="card">
      <div className="card-header">
        <h2>{activeType?.label || "Training Simulation"}</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
        {activeType?.description ||
          "Practice live with an AI counterpart. The system evaluates each reply, updates your skill profile, and adapts difficulty automatically."}
      </p>

      {canChoose && types.length > 1 ? (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Simulation type</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {types.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`tai-sim-type-btn${selectedSimType === t.key ? " tai-sim-type-active" : ""}`}
                onClick={() => setSelectedSimType(t.key)}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {t.traineeLabel} + {t.counterpartLabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}
      <div className="tai-setup-row">
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Training property</label>
          <select value={propertyId || ""} onChange={(e) => setPropertyId(Number(e.target.value))}>
            <option value="">Select a property...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-primary" disabled={!propertyId || starting} onClick={onStart}>
          {starting ? "Starting..." : "Start training"}
        </button>
      </div>
    </div>
  );
}
