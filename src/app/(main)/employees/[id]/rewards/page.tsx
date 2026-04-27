import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { EmployeeRewardPanel } from "@/components/rewards/EmployeeRewardPanel";

export const metadata: Metadata = {
  title: "Khen thưởng & Kỷ luật | GK-HRMS",
  description: "Quản lý khen thưởng và kỷ luật nhân viên",
};

// Next.js 15+ params là Promise — cần await
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeRewardsPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <ProtectedRoute module="employees" action="view">
      <EmployeeRewardPanel employeeId={id} />
    </ProtectedRoute>
  );
}
