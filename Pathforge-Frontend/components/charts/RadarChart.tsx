"use client";

interface RadarSeries {
  label: string;
  color: string;
  values: number[]; // 0-100 per axis
}

interface RadarChartProps {
  axes: string[];
  series: RadarSeries[];
  size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleIndex: number, total: number) {
  const angle = (angleIndex / total) * 2 * Math.PI - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function buildPolygon(cx: number, cy: number, maxR: number, values: number[], total: number) {
  return values
    .map((v, i) => {
      const r = (v / 100) * maxR;
      const p = polarToCartesian(cx, cy, r, i, total);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

export default function RadarChart({ axes, series, size = 260 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const gridLevels = [0.33, 0.66, 1.0];
  const n = axes.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid polygons */}
      {gridLevels.map((lvl, li) => {
        const pts = axes.map((_, i) => {
          const p = polarToCartesian(cx, cy, maxR * lvl, i, n);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <polygon
            key={li}
            points={pts}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
            className="dark:stroke-slate-700"
          />
        );
      })}

      {/* Axes */}
      {axes.map((_, i) => {
        const end = polarToCartesian(cx, cy, maxR, i, n);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={end.x} y2={end.y}
            stroke="#e2e8f0"
            strokeWidth="1"
            className="dark:stroke-slate-700"
          />
        );
      })}

      {/* Data series */}
      {series.map((s, si) => (
        <polygon
          key={si}
          points={buildPolygon(cx, cy, maxR, s.values, n)}
          fill={s.color}
          fillOpacity="0.25"
          stroke={s.color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}

      {/* Axis labels */}
      {axes.map((label, i) => {
        const labelR = maxR + 18;
        const p = polarToCartesian(cx, cy, labelR, i, n);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="#64748b"
            className="font-medium"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
