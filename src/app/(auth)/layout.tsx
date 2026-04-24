// ============================================================================
// GK-HRMS — Auth Layout
// Layout cho route group (auth): KHÔNG có Sidebar, KHÔNG có Topbar
// Chỉ render children (LoginForm) + Toaster
// ============================================================================

import { Toaster } from "@/components/ui/sonner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
