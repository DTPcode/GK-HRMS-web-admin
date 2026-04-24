import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}
