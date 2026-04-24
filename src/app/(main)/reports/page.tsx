import type { Metadata } from "next";
import { ReportPageClient } from "@/components/reports/ReportPageClient";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

export const metadata: Metadata = {
  title: "Báo cáo | GK-HRMS",
  description: "Báo cáo tổng hợp nhân sự, lương, chấm công — Lẩu Nấm Gia Khánh",
};

export default function ReportsPage() {
  return (
    <ProtectedRoute module="reports" action="view">
      <ReportPageClient />
    </ProtectedRoute>
  );
}
