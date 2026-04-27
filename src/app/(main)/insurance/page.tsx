import type { Metadata } from "next";
import { InsurancePageClient } from "@/components/insurance/InsurancePageClient";

export const metadata: Metadata = {
  title: "Bảo hiểm | GK-HRMS",
  description: "Quản lý BHXH · BHYT · BHTN toàn chuỗi Lẩu Nấm Gia Khánh",
};

export default function InsurancePage() {
  return <InsurancePageClient />;
}
