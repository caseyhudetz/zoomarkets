"use client";

interface PriceChartProps {
  data: { timestamp: number; yesPrice: number }[];
}

export function PriceChart({ data }: PriceChartProps) {
  if (data.length < 2) return null;

  const width = 200;
  const height = 30;
  const padding = 2;

  const prices = data.map((d) => d.yesPrice);
  const minP = Math.min(...prices, 0);
  const maxP = Math.max(...prices, 1);
  const range = maxP - minP || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y =
      height - padding - ((d.yesPrice - minP) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-7"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(0, 255, 136)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(0, 255, 136)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${width - padding},${height} L ${padding},${height} Z`}
        fill="url(#sparkGrad)"
      />
      <path
        d={pathD}
        fill="none"
        stroke="rgb(0, 255, 136)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
