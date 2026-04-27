"use client";

// ============================================================================
// GK-HRMS — EmployeeDetail
// Chi tiết nhân viên: info card + tabs (TK ngân hàng, bằng cấp, hợp đồng,
//   chấm công, lương, khen thưởng & kỷ luật, bảo hiểm)
// ============================================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, Calendar, Award, ShieldCheck, CreditCard, GraduationCap, FileText, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useEmployeeStore } from "@/store/employeeStore";
import { BankAccountPanel } from "@/components/employees/BankAccountPanel";
import { QualificationPanel } from "@/components/employees/QualificationPanel";
import { ContractPanel } from "@/components/employees/ContractPanel";
import { AttendancePanel } from "@/components/employees/AttendancePanel";
import { PayrollPanel } from "@/components/employees/PayrollPanel";
import { RewardDisciplinePanel } from "@/components/employees/RewardDisciplinePanel";
import { InsurancePanel } from "@/components/employees/InsurancePanel";
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
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${EMPLOYEE_STATUS_COLORS[emp.status] ?? ""
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
          <TabsTrigger value="bank" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Tài khoản NH
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            Bằng cấp
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Hợp đồng
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Chấm công
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            Lương
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-1.5">
            <Award className="h-4 w-4" />
            Khen thưởng & Kỷ luật
          </TabsTrigger>
          <TabsTrigger value="insurance" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Bảo hiểm
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bank" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <BankAccountPanel employeeId={emp.id} employeeName={emp.name} />
          </div>
        </TabsContent>
        <TabsContent value="qualifications" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <QualificationPanel employeeId={emp.id} />
          </div>
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <ContractPanel employeeId={emp.id} />
          </div>
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <AttendancePanel employeeId={emp.id} />
          </div>
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <PayrollPanel employeeId={emp.id} />
          </div>
        </TabsContent>
        <TabsContent value="rewards" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <RewardDisciplinePanel employeeId={emp.id} />
          </div>
        </TabsContent>
        <TabsContent value="insurance" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <InsurancePanel employeeId={emp.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
