import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";

function formatSkillLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SkillRadar({ skillMap, skills }) {
  const entries = skills && skills.length
    ? skills.map((k) => [k, skillMap?.[k] ?? 50])
    : Object.entries(skillMap || {});

  const data = entries.map(([key, value]) => ({
    skill: formatSkillLabel(key),
    value: Math.round(Number(value) || 0)
  }));
  if (!data.length) return null;
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar name="Level" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
