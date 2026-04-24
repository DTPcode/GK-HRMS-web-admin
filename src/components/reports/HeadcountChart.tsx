"use client";

// ============================================================================
// GK-HRMS — HeadcountChart
// Biến động nhân sự: SVG line chart + bar chart bằng CSS
// Không dùng thư viện chart — SVG thuần cho dự án intern
// ============================================================================

import { useMemo } from "react";
import { useEmployeeStore } from "@/store/employeeStore";
import type { Employee } from "@/types/employee";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonthlyHeadcount {
  month: string; // "MM/YYYY"
  total: number;
}

interface DeptBreakdown {
  department: string;
  count: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tạo dữ liệu headcount theo tháng (12 tháng gần nhất) */
function computeMonthlyHeadcount(employees: Employee[]): MonthlyHeadcount[] {
  const now = new Date();
  const data: MonthlyHeadcount[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const isoMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    // Đếm NV đã bắt đầu làm trước tháng này và chưa nghỉ
    const count = employees.filter((e) => {
      const started = e.startDate <= `${isoMonth}-31`;
      const notResigned = e.status !== "resigned";
      return started && notResigned;
    }).length;

    data.push({ month: monthKey, total: count });
  }

  return data;
}

/** Breakdown theo phòng ban */
function computeDeptBreakdown(employees: Employee[]): DeptBreakdown[] {
  const active = employees.filter((e) => e.status === "active");
  const deptMap = new Map<string, number>();

  for (const e of active) {
    deptMap.set(e.department, (deptMap.get(e.department) ?? 0) + 1);
  }

  const total = active.length || 1;
  return Array.from(deptMap, ([department, count]) => ({
    department,
    count,
    percentage: Math.round((count / total) * 100),
  })).sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// SVG Colors
// ---------------------------------------------------------------------------

const CHART_COLOR = "#3b82f6";
const CHART_BG = "#dbeafe";
const DEPT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeadcountChart() {
  const { employees } = useEmployeeStore();

  const monthlyData = useMemo(() => computeMonthlyHeadcount(employees), [employees]);
  const deptData = useMemo(() => computeDeptBreakdown(employees), [employees]);

  // ── SVG Line Chart ──
  const maxVal = Math.max(...monthlyData.map((d) => d.total), 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = 700;
  const chartH = 250;
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;

  const points = monthlyData.map((d, i) => ({
    x: padding.left + (i / Math.max(monthlyData.length - 1, 1)) * innerW,
    y: padding.top + innerH - (d.total / maxVal) * innerH,
    label: d.month,
    value: d.total,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${points[0].x},${padding.top + innerH} ${points.map((p) => `L ${p.x},${p.y}`).join(" ")} L ${points[points.length - 1].x},${padding.top + innerH} Z`;

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = Math.round((maxVal / 4) * i);
    const y = padding.top + innerH - (val / maxVal) * innerH;
    return { val, y };
  });

  return (
    <div className="space-y-6">
      {/* ── Line Chart: Headcount theo tháng ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          Biến động nhân sự 12 tháng gần nhất
        </h3>

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <g key={`y-${i}`}>
              <line
                x1={padding.left}
                y1={t.y}
                x2={chartW - padding.right}
                y2={t.y}
                stroke="#e2e8f0"
                strokeDasharray="4"
              />
              <text
                x={padding.left - 8}
                y={t.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px]"
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill={CHART_BG} opacity={0.5} />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke={CHART_COLOR}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />

          {/* Dots + labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill="white" stroke={CHART_COLOR} strokeWidth={2} />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="fill-slate-700 text-[9px] font-medium"
              >
                {p.value}
              </text>
              {i % 2 === 0 && (
                <text
                  x={p.x}
                  y={chartH - 8}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px]"
                >
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* ── Bar Chart: Phân bổ theo phòng ban (CSS width %) ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          Phân bổ nhân sự theo phòng ban
        </h3>

        {deptData.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có dữ liệu nhân viên.</p>
        ) : (
          <div className="space-y-3">
            {deptData.map((d, i) => (
              <div key={d.department} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-slate-600 truncate">
                  {d.department}
                </span>
                <div className="relative h-7 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(d.percentage, 4)}%`,
                      backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length],
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-medium text-slate-700">
                  {d.count} ({d.percentage}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
