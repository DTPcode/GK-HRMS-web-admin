import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { EmployeeInsurancePanel } from "@/components/insurance/EmployeeInsurancePanel";

export const metadata: Metadata = {
  title: "Bảo hiểm | GK-HRMS",
  description: "Quản lý bảo hiểm xã hội nhân viên",
};

// Next.js 15+ params là Promise — cần await
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeInsurancePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <ProtectedRoute module="employees" action="view">
      <EmployeeInsurancePanel employeeId={id} />
    </ProtectedRoute>
  );
}
