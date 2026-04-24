import type { Metadata } from "next";
import { ContractPageClient } from "@/components/contracts/ContractPageClient";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

export const metadata: Metadata = {
  title: "Hợp đồng | GK-HRMS",
  description: "Quản lý hợp đồng lao động chuỗi nhà hàng Lẩu Nấm Gia Khánh",
};

export default function ContractsPage() {
  return (
    <ProtectedRoute module="contracts" action="view">
      <ContractPageClient />
    </ProtectedRoute>
  );
}
