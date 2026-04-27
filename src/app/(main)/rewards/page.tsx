import type { Metadata } from "next";
import { RewardPageClient } from "@/components/rewards/RewardPageClient";

export const metadata: Metadata = {
  title: "Khen thưởng & Kỷ luật | GK-HRMS",
  description: "Quản lý khen thưởng và kỷ luật nhân sự toàn chuỗi Lẩu Nấm Gia Khánh",
};

export default function RewardsPage() {
  return <RewardPageClient />;
}
