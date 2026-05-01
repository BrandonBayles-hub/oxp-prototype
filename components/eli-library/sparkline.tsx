import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  className?: string;
  stroke?: string;
  fill?: string;
}

export function Sparkline({
  values,
  className,
  stroke = "hsl(var(--foreground))",
  fill = "hsl(var(--foreground) / 0.08)",
}: SparklineProps) {
  if (values.length < 2) return null;

  const w = 80;
  const h = 28;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const areaPoints = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("inline-block", className)}
      style={{ width: w, height: h }}
      aria-hidden
    >
      <polygon points={areaPoints} fill={fill} />
      <polyline points={polyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
