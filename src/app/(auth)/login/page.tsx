// ============================================================================
// GK-HRMS — Login Page
// Route: /login
// Metadata server-side, LoginForm client-side
// ============================================================================

import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | GK-HRMS",
  description: "Đăng nhập vào hệ thống quản lý nhân sự Lẩu Nấm Gia Khánh",
};

export default function LoginPage() {
  return <LoginForm />;
}
