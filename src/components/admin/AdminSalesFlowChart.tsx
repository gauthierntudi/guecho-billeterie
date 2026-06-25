"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice, cn } from "@/lib/utils";

export type SalesFlowPoint = {
  date: string;
  label: string;
  revenueCdf: number;
  revenueUsd: number;
  orders: number;
  quantity: number;
};

export type SalesFlowSeries = {
  tickets: Array<{ id: string; name: string }>;
  byTicket: Record<string, SalesFlowPoint[]>;
};

type AdminSalesFlowChartProps = {
  series: SalesFlowSeries;
};

const CHART = {
  width: 720,
  height: 260,
  padLeft: 56,
  padRight: 24,
  padY: 24,
  padBottom: 36,
};

function formatAxisValue(value: number, currency: "CDF" | "USD") {
  if (currency === "USD") {
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return String(value);
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index++) {
    const point0 = points[index - 1] ?? points[index];
    const point1 = points[index];
    const point2 = points[index + 1];
    const point3 = points[index + 2] ?? point2;
    const cp1x = point1.x + (point2.x - point0.x) / 6;
    const cp1y = point1.y + (point2.y - point0.y) / 6;
    const cp2x = point2.x - (point3.x - point1.x) / 6;
    const cp2y = point2.y - (point3.y - point1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point2.x} ${point2.y}`;
  }
  return path;
}

function getYTicks(maxValue: number, currency: "CDF" | "USD") {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  if (currency === "USD") {
    const step = Math.max(Math.ceil(maxValue / 4), 1);
    return Array.from({ length: 5 }, (_, index) => index * step);
  }
  const step = Math.ceil(maxValue / 4 / 1000) * 1000 || 1;
  return Array.from({ length: 5 }, (_, index) => index * step);
}

export function AdminSalesFlowChart({ series }: AdminSalesFlowChartProps) {
  const { currency } = useCurrency();
  const [ticketFilter, setTicketFilter] = useState("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = series.byTicket[ticketFilter] ?? series.byTicket.all ?? [];
  const selectedTicket =
    series.tickets.find((ticket) => ticket.id === ticketFilter) ??
    series.tickets[0];

  const values = data.map((point) =>
    currency === "USD" ? point.revenueUsd : point.revenueCdf,
  );
  const maxValue = Math.max(...values, 0);
  const yTicks = useMemo(
    () => getYTicks(maxValue, currency),
    [maxValue, currency],
  );
  const yMax = yTicks.at(-1) || 1;

  const plotLeft = CHART.padLeft;
  const plotRight = CHART.width - CHART.padRight;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = CHART.height - CHART.padY - CHART.padBottom;

  const chartPoints = data.map((point, index) => {
    const value = currency === "USD" ? point.revenueUsd : point.revenueCdf;
    const x = plotLeft + (index / Math.max(data.length - 1, 1)) * plotWidth;
    const y = CHART.padY + plotHeight - (value / yMax) * plotHeight;
    return { x, y, value, ...point };
  });

  const linePath = buildSmoothPath(chartPoints);
  const areaPath = `${linePath} L ${chartPoints.at(-1)?.x ?? plotLeft} ${
    CHART.padY + plotHeight
  } L ${chartPoints[0]?.x ?? plotLeft} ${CHART.padY + plotHeight} Z`;

  const activePoint = activeIndex !== null ? chartPoints[activeIndex] : null;
  const periodTotal = values.reduce((sum, value) => sum + value, 0);
  const periodOrders = data.reduce((sum, point) => sum + point.orders, 0);
  const periodQuantity = data.reduce((sum, point) => sum + point.quantity, 0);
  const strokeColor = currency === "USD" ? "#10b981" : "#1c2a3f";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            7 derniers jours · {currency}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
            {formatPrice(periodTotal, currency)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {periodQuantity} billet{periodQuantity > 1 ? "s" : ""} ·{" "}
            {periodOrders} commande{periodOrders > 1 ? "s" : ""}
          </p>
        </div>

        <label className="relative min-w-[200px]">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">
            Type de billet
          </span>
          <select
            value={ticketFilter}
            onChange={(event) => {
              setTicketFilter(event.target.value);
              setActiveIndex(null);
            }}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2.5 pl-3 pr-9 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          >
            {series.tickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute bottom-2.5 right-3 h-4 w-4 text-zinc-400" />
        </label>
      </div>

      {selectedTicket ? (
        <p className="mb-4 text-xs text-zinc-500">
          Filtre actif : <span className="font-medium text-zinc-700">{selectedTicket.name}</span>
        </p>
      ) : null}

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          className="h-[260px] w-full min-w-[560px]"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id="salesFlowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = CHART.padY + plotHeight - (tick / yMax) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={plotLeft}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={plotLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-zinc-400 text-[10px]"
                >
                  {currency === "USD"
                    ? `$${formatAxisValue(tick, currency)}`
                    : formatAxisValue(tick, currency)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#salesFlowFill)" />
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {chartPoints.map((point, index) => (
            <g key={point.date}>
              <rect
                x={
                  index === 0
                    ? plotLeft
                    : (chartPoints[index - 1].x + point.x) / 2
                }
                y={CHART.padY}
                width={
                  index === 0
                    ? (point.x + chartPoints[index + 1]?.x) / 2 - plotLeft
                    : index === chartPoints.length - 1
                      ? plotRight - (chartPoints[index - 1].x + point.x) / 2
                      : (chartPoints[index + 1].x - chartPoints[index - 1].x) / 2
                }
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={activeIndex === index ? 6 : 4}
                className={cn("transition-all")}
                fill={activeIndex === index ? strokeColor : "white"}
                stroke={strokeColor}
                strokeWidth={2}
              />
              <text
                x={point.x}
                y={CHART.height - 10}
                textAnchor="middle"
                className="fill-zinc-500 text-[11px] capitalize"
              >
                {point.label}
              </text>
            </g>
          ))}

          {activePoint ? (
            <g>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={CHART.padY}
                y2={CHART.padY + plotHeight}
                stroke="#cbd5e1"
                strokeDasharray="4 4"
              />
              <foreignObject
                x={Math.min(activePoint.x + 8, CHART.width - 168)}
                y={Math.max(activePoint.y - 72, 8)}
                width="160"
                height="88"
              >
                <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-md">
                  <p className="text-[11px] capitalize text-zinc-500">
                    {activePoint.label}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatPrice(activePoint.value, currency)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {activePoint.quantity} billet
                    {activePoint.quantity > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {activePoint.orders} commande
                    {activePoint.orders > 1 ? "s" : ""}
                  </p>
                </div>
              </foreignObject>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
