"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LeverageDailyPoint = {
  date: string;
  effective: number;
  runtime: number;
};

export function LeverageAreaChart({ data }: { data: LeverageDailyPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="lev-eff" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-brand-400)"
                stopOpacity={0.32}
              />
              <stop
                offset="100%"
                stopColor="var(--color-brand-400)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="lev-rt" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-stroke-soft)"
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
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<AreaTooltip />} />
          <Area
            type="monotone"
            dataKey="runtime"
            stroke="#38bdf8"
            strokeWidth={1.75}
            fill="url(#lev-rt)"
            dot={false}
            name="Runtime"
          />
          <Area
            type="monotone"
            dataKey="effective"
            stroke="var(--color-brand-400)"
            strokeWidth={2.5}
            fill="url(#lev-eff)"
            dot={false}
            name="Effective"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="count-in rounded-[10px] bg-[var(--color-bg-surface-elevated)] px-[12px] py-[10px] ring-1 ring-[var(--color-stroke-sub)] shadow-[var(--shadow-regular-md)]"
      style={{ pointerEvents: "none", animationDuration: "160ms" }}
    >
      <div className="text-[11px] text-[var(--color-text-soft)]">{label}</div>
      <div className="mt-[6px] flex flex-col gap-[4px]">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-[8px]">
            <span
              className="size-[8px] rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[11px] text-[var(--color-text-soft)]">
              {p.name}
            </span>
            <span className="ml-auto text-[12px] font-semibold tabular-nums text-[var(--color-text-strong)]">
              {p.value.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarginBarChart({
  billable,
  cost,
}: {
  billable: number;
  cost: number;
}) {
  const data = [
    { name: "Billable", value: billable, color: "var(--color-brand-400)" },
    { name: "Cost", value: cost, color: "#f43f5e" },
  ];
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
          barCategoryGap={48}
        >
          <CartesianGrid vertical={false} stroke="var(--color-stroke-soft)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fill: "var(--color-text-soft)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-soft)", fontSize: 11 }}
            width={56}
            tickFormatter={(v) => `$${(v as number).toLocaleString("en-US")}`}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-[10px] bg-[var(--color-bg-surface-elevated)] px-[12px] py-[10px] ring-1 ring-[var(--color-stroke-sub)] shadow-[var(--shadow-regular-md)]">
      <div className="flex items-center gap-[8px]">
        <span
          className="size-[8px] rounded-full"
          style={{ backgroundColor: p.payload.color }}
        />
        <span className="text-[11px] text-[var(--color-text-soft)]">
          {p.payload.name}
        </span>
        <span className="ml-[12px] text-[12px] font-semibold tabular-nums text-[var(--color-text-strong)]">
          ${p.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
