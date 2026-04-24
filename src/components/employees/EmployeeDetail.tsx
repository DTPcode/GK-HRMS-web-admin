"use client";

// ============================================================================
// GK-HRMS — EmployeeDetail
// Chi tiết nhân viên: info card + tabs (hợp đồng, chấm công, lương)
// ============================================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useEmployeeStore } from "@/store/employeeStore";
import { usePermission } from "@/hooks/usePermission";
import {
  formatDate,
  getInitials,
} from "@/lib/utils";
import { SalaryDisplay } from "@/components/shared/SalaryDisplay";
import { MaskedNationalId } from "@/components/shared/MaskedNationalId";
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_COLORS,
} from "@/lib/constants";

interface EmployeeDetailProps {
  employeeId: string;
}

export function EmployeeDetail({ employeeId }: EmployeeDetailProps) {
  const router = useRouter();
  const { employees, loading, error, fetchEmployees } =
    useEmployeeStore();
  const canUpdate = usePermission("employee", "update");

  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
  }, [employees.length, fetchEmployees]);

  if (loading) return <TableSkeleton rows={6} columns={4} />;
  if (error) return <ErrorMessage message={error} onRetry={fetchEmployees} />;

  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return <ErrorMessage message="Không tìm thấy nhân viên" />;

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "Nhân viên", href: "/employees" },
          { label: emp.name },
        ]}
      />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/employees")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </div>
        {canUpdate && (
          <Button
            onClick={() => router.push(`/employees/${emp.id}/edit`)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          {/* Avatar lớn */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
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

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">{emp.name}</h2>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  EMPLOYEE_STATUS_COLORS[emp.status] ?? ""
                }`}
              >
                {EMPLOYEE_STATUS_LABELS[emp.status] ?? emp.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {emp.position} — {emp.department}
            </p>

            {/* Contact row */}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {emp.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {emp.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Từ {formatDate(emp.startDate)}
              </span>
            </div>
          </div>

          {/* Salary */}
          <div className="text-right">
            <p className="text-sm text-slate-500">
              Lương tháng
            </p>
            <SalaryDisplay salary={emp.salary} className="text-xl font-bold text-slate-800" />
          </div>
        </div>

        {/* Extra fields */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-slate-400">Mã NV</p>
            <p className="font-medium text-slate-700">{emp.id}</p>
          </div>
          <div>
            <p className="text-slate-400">CCCD</p>
            <p className="font-medium text-slate-700">
              <MaskedNationalId value={emp.nationalId} />
            </p>
          </div>
          <div>
            <p className="text-slate-400">Chi nhánh</p>
            <p className="font-medium text-slate-700">{emp.branchId}</p>
          </div>
          <div>
            <p className="text-slate-400">Cập nhật lần cuối</p>
            <p className="font-medium text-slate-700">
              {formatDate(emp.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Hợp đồng</TabsTrigger>
          <TabsTrigger value="attendance">Chấm công</TabsTrigger>
          <TabsTrigger value="payroll">Lương</TabsTrigger>
        </TabsList>
        <TabsContent value="contracts" className="mt-4">
          {/* TODO: ContractTable filtered by employeeId */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            TODO: Danh sách hợp đồng của nhân viên
          </div>
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          {/* TODO: AttendanceTable filtered by employeeId */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            TODO: Lịch sử chấm công
          </div>
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          {/* TODO: PayrollTable filtered by employeeId */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            TODO: Lịch sử lương
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
