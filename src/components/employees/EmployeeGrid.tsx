"use client";

// ============================================================================
// GK-HRMS — EmployeeGrid
// Hiển thị nhân viên dạng card grid — view mode "grid"
// ============================================================================

import { useRouter } from "next/navigation";
import { useEmployeeStore } from "@/store/employeeStore";
import { formatCurrency, getInitials } from "@/lib/utils";
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_COLORS,
  SALARY_TYPE_LABELS,
} from "@/lib/constants";
import { MapPin, Phone } from "lucide-react";

export function EmployeeGrid() {
  const router = useRouter();
  const employees = useEmployeeStore((s) => s.employees);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((emp) => (
        <div
          key={emp.id}
          onClick={() => router.push(`/employees/${emp.id}`)}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          {/* Header: Avatar + Name */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {emp.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={emp.avatarUrl}
                  alt={emp.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getInitials(emp.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">{emp.name}</p>
              <p className="truncate text-xs text-slate-400">{emp.position}</p>
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{emp.department}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Phone className="h-3.5 w-3.5" />
              <span>{emp.phone}</span>
            </div>
          </div>

          {/* Footer: Salary + Status */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-medium text-slate-700">
              {formatCurrency(emp.salary)}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                EMPLOYEE_STATUS_COLORS[emp.status] ?? ""
              }`}
            >
              {EMPLOYEE_STATUS_LABELS[emp.status] ?? emp.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
