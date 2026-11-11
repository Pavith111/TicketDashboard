"use client";

import { format } from "date-fns";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme/use-theme";
import { STATUS_META, type TicketStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Monochrome chart palette. Validated pairs (CVD + normal-vision separation
 * pass; contrast ≥ 3:1 against the surface):
 *   light: #111111 / #71717a     dark: #fafafa / #71717a
 * The second series is also dashed, so identity never relies on shade alone.
 */
function usePalette() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    primary: dark ? "#fafafa" : "#111111",
    secondary: "#71717a",
    grid: dark ? "#27272a" : "#ededf0",
    axis: dark ? "#a1a1aa" : "#71717a",
    cursor: dark ? "#3f3f46" : "#d4d4d8",
    surface: dark ? "#18181b" : "#ffffff",
  };
}

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  dashedKeys = [],
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  dashedKeys?: string[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-border bg-popover px-3 py-2.5 text-xs shadow-[var(--shadow-elevated)]">
      {label !== undefined && (
        <p className="mb-1.5 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              className={cn("h-0 w-3 border-t-2", dashedKeys.includes(String(entry.dataKey)) && "border-dashed")}
              style={{ borderColor: entry.color }}
            />
            <span className="flex-1 text-muted-foreground capitalize">{entry.name}</span>
            <span className="tabular font-mono font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: { day: string; created: number; resolved: number }[] }) {
  const c = usePalette();
  const totals = data.reduce(
    (acc, d) => ({ created: acc.created + d.created, resolved: acc.resolved + d.resolved }),
    { created: 0, resolved: 0 },
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <LegendItem label="Created" value={totals.created} color={c.primary} />
        <LegendItem label="Resolved" value={totals.resolved} color={c.secondary} dashed />
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fill-created" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.primary} stopOpacity={0.12} />
                <stop offset="100%" stopColor={c.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={28}
              tick={{ fill: c.axis, fontSize: 11 }}
              tickFormatter={(v: string) => format(new Date(v), "d MMM")}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: c.axis, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ stroke: c.cursor, strokeWidth: 1 }}
              content={
                <ChartTooltip
                  dashedKeys={["resolved"]}
                  labelFormatter={(v) => format(new Date(String(v)), "EEE, d MMM yyyy")}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="created"
              name="Created"
              stroke={c.primary}
              strokeWidth={2}
              fill="url(#fill-created)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface, fill: c.primary }}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke={c.secondary}
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="transparent"
              activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface, fill: c.secondary }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendItem({ label, value, color, dashed }: { label: string; value: number; color: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("h-0 w-4 border-t-2", dashed && "border-dashed")} style={{ borderColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-mono font-semibold text-foreground">{value}</span>
    </span>
  );
}

/** Ranked horizontal bars — one series, one colour. */
export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  const c = usePalette();
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No tickets in this period.</p>;
  }
  return (
    <div style={{ height: Math.max(160, data.length * 34) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 12 }}
            tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
          />
          <Tooltip cursor={{ fill: c.grid, opacity: 0.6 }} content={<ChartTooltip />} />
          <Bar dataKey="value" name="Tickets" fill={c.primary} radius={[0, 4, 4, 0]} maxBarSize={18}>
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              style={{ fill: c.axis, fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Part-to-whole as one segmented bar plus a labelled list (status colours are semantic). */
export function StatusBreakdown({ data }: { data: { status: TicketStatus; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="tabular font-heading text-3xl font-bold tracking-tight">{total}</span>
        <span className="text-xs text-muted-foreground">tickets in total</span>
      </div>
      <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-muted" role="img" aria-label="Tickets by status">
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d, i) => (
              <motion.span
                key={d.status}
                title={`${STATUS_META[d.status].label}: ${d.value}`}
                className={cn("h-full first:rounded-l-full last:rounded-r-full", STATUS_META[d.status].dot)}
                initial={{ width: 0 }}
                animate={{ width: `${(d.value / total) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
      </div>
      <ul className="mt-6 flex flex-col divide-y divide-border">
        {data.map((d) => (
          <li key={d.status} className="flex items-center gap-3 py-2.5 text-sm">
            <span className={cn("size-2 rounded-full", STATUS_META[d.status].dot)} aria-hidden />
            <span className="flex-1">{STATUS_META[d.status].label}</span>
            <span className="tabular font-mono text-xs text-muted-foreground">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
            <span className="tabular w-10 text-right font-mono font-medium">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
