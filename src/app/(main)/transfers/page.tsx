import type { Metadata } from "next";
import { TransferPageClient } from "@/components/transfers/TransferPageClient";

export const metadata: Metadata = {
  title: "Điều chuyển nhân sự | GK-HRMS",
  description: "Quản lý điều chuyển & cho mượn nhân sự giữa 8 chi nhánh Lẩu Nấm Gia Khánh",
};

export default function TransfersPage() {
  return <TransferPageClient />;
}
