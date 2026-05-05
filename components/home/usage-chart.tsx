"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface UsagePoint {
  date: string;
  value: number;
}

export function UsageChart({
  data,
  unit,
}: {
  data: UsagePoint[];
  unit: string;
}) {
  return (
    <div className="h-[240px] w-full sm:h-[300px] lg:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 24, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="usage-fill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-brand-400)"
                stopOpacity={0.18}
              />
              <stop
                offset="100%"
                stopColor="var(--color-brand-400)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-stroke-soft)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fill: "var(--color-text-soft)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-soft)", fontSize: 11 }}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-stroke-sub)", strokeWidth: 1 }}
            content={<ChartTooltip unit={unit} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-brand-400)"
            strokeWidth={2.5}
            fill="url(#usage-fill)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#0b1f21",
              stroke: "var(--color-brand-400)",
              strokeWidth: 2,
              className: "transition-[r] duration-200",
            }}
            animationDuration={720}
            animationEasing="ease-out"
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="count-in rounded-[10px] bg-[var(--color-bg-surface-elevated)] px-[12px] py-[10px] ring-1 ring-[var(--color-stroke-sub)] shadow-[var(--shadow-regular-md)]"
      style={{ pointerEvents: "none", animationDuration: "160ms" }}
    >
      <div className="text-[11px] text-[var(--color-text-soft)]">{label}</div>
      <div className="mt-[4px] flex items-baseline gap-[6px]">
        <span className="text-[14px] font-semibold tabular-nums text-[var(--color-text-strong)]">
          {payload[0].value.toLocaleString("en-US")}
        </span>
        <span className="text-[11px] text-[var(--color-text-soft)]">
          {unit}
        </span>
      </div>
    </div>
  );
}
