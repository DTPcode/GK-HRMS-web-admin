"use client";

// ============================================================================
// GK-HRMS — Employee Edit Page
// Route: /employees/[id]/edit — "use client" vì cần useParams + store + toast
// ============================================================================

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useEmployeeStore } from "@/store/employeeStore";
import type { EmployeeFormData } from "@/types/employee";

export default function EmployeeEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { employees, loading, error, fetchEmployees, updateEmployee } =
    useEmployeeStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch employees nếu chưa có data (trường hợp user vào URL trực tiếp)
  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
  }, [employees.length, fetchEmployees]);

  const employee = employees.find((e) => e.id === params.id);

  // Redirect nếu đã load xong mà không tìm thấy NV
  useEffect(() => {
    if (!loading && employees.length > 0 && !employee) {
      toast.error("Không tìm thấy nhân viên");
      router.push("/employees");
    }
  }, [loading, employees.length, employee, router]);

  const handleSubmit = async (data: EmployeeFormData) => {
    if (!params.id) return;
    setIsSubmitting(true);
    try {
      await updateEmployee(params.id, data);
      toast.success("Cập nhật thành công");
      router.push(`/employees/${params.id}`);
    } catch {
      toast.error("Không thể cập nhật nhân viên. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div>
        <BreadCrumb
          items={[
            { label: "Nhân viên", href: "/employees" },
            { label: "..." },
            { label: "Chỉnh sửa" },
          ]}
        />
        <PageHeader title="Chỉnh sửa nhân viên" description="Đang tải..." />
        <TableSkeleton rows={6} columns={2} />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div>
        <BreadCrumb
          items={[
            { label: "Nhân viên", href: "/employees" },
            { label: "Lỗi" },
          ]}
        />
        <ErrorMessage message={error} onRetry={fetchEmployees} />
      </div>
    );
  }

  // ── Employee not found (redirect sẽ xử lý trong useEffect) ──
  if (!employee) return null;

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "Nhân viên", href: "/employees" },
          {
            label: employee.name,
            href: `/employees/${params.id}`,
          },
          { label: "Chỉnh sửa" },
        ]}
      />
      <PageHeader
        title="Chỉnh sửa nhân viên"
        description={employee.name}
      />
      <EmployeeForm
        defaultValues={employee}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  );
}
