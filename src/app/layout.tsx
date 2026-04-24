import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "GK-HRMS | Quản lý Nhân sự Gia Khánh",
  description:
    "Hệ thống quản lý nhân sự chuỗi nhà hàng Lẩu Nấm Gia Khánh — Quản lý nhân viên, hợp đồng, chấm công, tính lương",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full font-sans">
        <div className="flex h-screen bg-slate-50">
          {/* Sidebar — client component, tự quản lý collapse state */}
          <Sidebar />

          {/* Main area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Topbar — client component, hiển thị user info */}
            <Topbar />

            {/* Page content — scrollable */}
            <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">{children}</main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
