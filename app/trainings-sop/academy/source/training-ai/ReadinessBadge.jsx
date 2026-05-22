export function ReadinessBadge({ readiness }) {
  const r = String(readiness || "not_ready").toLowerCase().replace(/\s/g, "_");
  const label =
    r === "not_ready"
      ? "Not ready"
      : r === "needs_work"
        ? "Needs work"
        : r === "ready"
          ? "Ready"
          : r === "exceptional"
            ? "Exceptional"
            : readiness;
  return <span className={`tai-readiness ${r}`}>{label}</span>;
}
