"use client";

// ============================================================================
// GK-HRMS — Employee Create Page
// Route: /employees/new — "use client" vì gọi store + toast
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { useEmployeeStore } from "@/store/employeeStore";
import type { EmployeeFormData } from "@/types/employee";

export default function EmployeeCreatePage() {
  const router = useRouter();
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: EmployeeFormData) => {
    setIsLoading(true);
    try {
      await addEmployee(data);
      toast.success("Thêm nhân viên thành công");
      router.push("/employees");
    } catch {
      toast.error("Không thể thêm nhân viên. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "Nhân viên", href: "/employees" },
          { label: "Thêm mới" },
        ]}
      />
      <PageHeader
        title="Thêm nhân viên mới"
        description="Nhập thông tin để tạo hồ sơ nhân viên"
      />
      <EmployeeForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
