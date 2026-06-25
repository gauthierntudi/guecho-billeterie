export function AdminSparkline({
  points,
  color = "#10b981",
  className,
}: {
  points: number[];
  color?: string;
  className?: string;
}) {
  if (points.length < 2) return null;

  const width = 88;
  const height = 36;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}

export function AdminAreaChart({
  points,
  labels,
}: {
  points: number[];
  labels: string[];
}) {
  const width = 560;
  const height = 220;
  const max = Math.max(...points, 1);
  const min = 0;
  const range = max - min || 1;

  const lineCoords = points.map((value, index) => {
    const x = 24 + (index / Math.max(points.length - 1, 1)) * (width - 48);
    const y = height - 28 - ((value - min) / range) * (height - 56);
    return { x, y, value };
  });

  const linePath = lineCoords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${lineCoords.at(-1)?.x ?? 0} ${height - 28} L ${lineCoords[0]?.x ?? 0} ${height - 28} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full min-w-[480px]">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - 28 - ratio * (height - 56);
          return (
            <line
              key={ratio}
              x1="24"
              x2={width - 24}
              y1={y}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          );
        })}
        <path d={areaPath} fill="url(#areaFill)" />
        <path d={linePath} fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        {lineCoords.map((point, index) => (
          <g key={labels[index] ?? index}>
            <circle cx={point.x} cy={point.y} r="4" fill="#18181b" />
            <text
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-zinc-400 text-[10px]"
            >
              {labels[index]}
            </text>
          </g>
        ))}
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181b" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
