import type { Metadata } from "next";
import { EmployeePageClient } from "@/components/employees/EmployeePageClient";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

export const metadata: Metadata = {
  title: "Nhân viên | GK-HRMS",
  description: "Quản lý danh sách nhân viên chuỗi nhà hàng Lẩu Nấm Gia Khánh",
};

/**
 * Employee List Page — Server Component.
 * ProtectedRoute kiểm tra quyền "employees.view" trước khi render.
 */
export default function EmployeesPage() {
  return (
    <ProtectedRoute module="employees" action="view">
      <EmployeePageClient />
    </ProtectedRoute>
  );
}
