import type { Metadata } from "next";
import { EmployeeDetail } from "@/components/employees/EmployeeDetail";

export const metadata: Metadata = {
  title: "Chi tiết nhân viên | GK-HRMS",
  description: "Xem thông tin chi tiết nhân viên",
};

// Next.js 15+ params là Promise — cần await
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <EmployeeDetail employeeId={id} />;
}
