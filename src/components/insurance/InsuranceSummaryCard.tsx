"use client";

// ============================================================================
// GK-HRMS — InsuranceSummaryCard
// 3 card tóm tắt: Lương đóng BH, NLĐ đóng/tháng, NSDLĐ đóng/tháng
// ============================================================================

import { DollarSign, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsuranceRecord } from "@/types/insurance";
import { computeInsuranceSummary } from "@/types/insurance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InsuranceSummaryCardProps {
  record: InsuranceRecord;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsuranceSummaryCard({ record }: InsuranceSummaryCardProps) {
  const summary = computeInsuranceSummary(record);

  const bhxhEmp = Math.round(record.insuredSalary * record.bhxhRate);
  const bhytEmp = Math.round(record.insuredSalary * record.bhytRate);
  const bhtnEmp = Math.round(record.insuredSalary * record.bhtnRate);

  const bhxhEr = Math.round(record.insuredSalary * record.bhxhEmployer);
  const bhytEr = Math.round(record.insuredSalary * record.bhytEmployer);
  const bhtnEr = Math.round(record.insuredSalary * record.bhtnEmployer);

  const cards = [
    {
      label: "Lương đóng BH",
      value: formatVND(record.insuredSalary),
      icon: DollarSign,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      iconColor: "text-blue-500",
      tooltip: null,
    },
    {
      label: "NLĐ đóng/tháng",
      value: formatVND(summary.employeeContribution),
      icon: User,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-500",
      tooltip: `BHXH: ${formatVND(bhxhEmp)} (${pct(record.bhxhRate)})\nBHYT: ${formatVND(bhytEmp)} (${pct(record.bhytRate)})\nBHTN: ${formatVND(bhtnEmp)} (${pct(record.bhtnRate)})`,
    },
    {
      label: "NSDLĐ đóng/tháng",
      value: formatVND(summary.employerContribution),
      icon: Building2,
      color: "text-violet-600 bg-violet-50 border-violet-200",
      iconColor: "text-violet-500",
      tooltip: `BHXH: ${formatVND(bhxhEr)} (${pct(record.bhxhEmployer)})\nBHYT: ${formatVND(bhytEr)} (${pct(record.bhytEmployer)})\nBHTN: ${formatVND(bhtnEr)} (${pct(record.bhtnEmployer)})`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "relative rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
              card.color.split(" ").slice(1).join(" ")
            )}
            title={card.tooltip ?? undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  card.color.split(" ").slice(1, 2).join(" ")
                )}
              >
                <Icon className={cn("h-5 w-5", card.iconColor)} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {card.label}
                </p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    card.color.split(" ")[0]
                  )}
                >
                  {card.value}
                </p>
              </div>
            </div>

            {/* Breakdown tooltip indicator */}
            {card.tooltip && (
              <div className="absolute right-3 top-3">
                <span className="text-xs text-slate-400 cursor-help" title={card.tooltip}>
                  ℹ️
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
