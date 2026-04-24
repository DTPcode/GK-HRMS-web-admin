import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | GK-HRMS",
  description: "Tổng quan hệ thống quản lý nhân sự Lẩu Nấm Gia Khánh",
};

/**
 * Dashboard Page — Server Component.
 * Chỉ export metadata + delegate toàn bộ UI xuống DashboardClient.
 * KHÔNG gọi fetch ở đây — data fetching trong client component với Zustand.
 */
export default function DashboardPage() {
  return <DashboardClient />;
}
