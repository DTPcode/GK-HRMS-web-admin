import type { Metadata } from "next";
import { PayrollPageClient } from "@/components/payroll/PayrollPageClient";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

export const metadata: Metadata = {
  title: "Tính lương | GK-HRMS",
  description: "Quản lý bảng lương chuỗi nhà hàng Lẩu Nấm Gia Khánh",
};

export default function PayrollPage() {
  return (
    <ProtectedRoute module="payroll" action="view">
      <PayrollPageClient />
    </ProtectedRoute>
  );
}
