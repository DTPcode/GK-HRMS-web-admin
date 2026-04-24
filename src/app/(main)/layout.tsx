// ============================================================================
// GK-HRMS — Main Layout
// Layout cho tất cả route chính (dashboard, employees, contracts, etc.)
// Bao gồm: Sidebar + Topbar + scrollable content area
// ============================================================================

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/ui/sonner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar — client component, tự quản lý collapse state */}
        <Sidebar />

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar — client component, hiển thị user info */}
          <Topbar />

          {/* Page content — scrollable */}
          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </>
  );
}
