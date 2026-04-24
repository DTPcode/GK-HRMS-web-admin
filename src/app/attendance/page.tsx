import type { Metadata } from "next";
import { AttendancePageClient } from "@/components/attendance/AttendancePageClient";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

export const metadata: Metadata = {
  title: "Chấm công | GK-HRMS",
  description:
    "Quản lý chấm công và đơn nghỉ phép chuỗi nhà hàng Lẩu Nấm Gia Khánh",
};

export default function AttendancePage() {
  return (
    <ProtectedRoute module="attendance" action="view">
      <AttendancePageClient />
    </ProtectedRoute>
  );
}
