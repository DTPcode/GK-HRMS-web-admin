import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { OffboardingPageClient } from "@/components/offboarding/OffboardingPageClient";

export const metadata: Metadata = {
  title: "Nghỉ việc | GK-HRMS",
  description: "Quản lý nghỉ việc & offboarding chuỗi nhà hàng Lẩu Nấm Gia Khánh",
};

export default function OffboardingPage() {
  return (
    <ProtectedRoute module="employees" action="view">
      <OffboardingPageClient />
    </ProtectedRoute>
  );
}
