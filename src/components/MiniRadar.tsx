// Mini radar "toile" en SVG pur (leger, pour affichage en tableau).
export default function MiniRadar({
  values,
  max = 5,
  size = 56,
  color = "#3B82F6",
}: {
  values: number[];
  max?: number;
  size?: number;
  color?: string;
}) {
  const n = values.length;
  if (n < 3) return null;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, val: number): [number, number] => {
    const rr = (Math.max(0, Math.min(max, val)) / max) * r;
    return [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))];
  };
  const poly = values.map((v, i) => point(i, v).join(",")).join(" ");
  const outline = values.map((_, i) => point(i, max).join(",")).join(" ");
  const hasData = values.some((v) => v > 0);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={outline} fill="none" stroke="#334155" strokeWidth="0.5" />
      {values.map((_, i) => {
        const [x, y] = point(i, max);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#334155" strokeWidth="0.5" />
        );
      })}
      {hasData && (
        <polygon points={poly} fill={color} fillOpacity="0.35" stroke={color} strokeWidth="1" />
      )}
    </svg>
  );
}
