import type { Metadata } from "next";
import { AccountPageClient } from "@/components/accounts/AccountPageClient";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

export const metadata: Metadata = {
  title: "Tài khoản | GK-HRMS",
  description: "Quản lý tài khoản và phân quyền hệ thống",
};

export default function AccountsPage() {
  return (
    <ProtectedRoute module="accounts" action="view">
      <AccountPageClient />
    </ProtectedRoute>
  );
}
