"use client";

// ============================================================================
// GK-HRMS — Contract Create Page
// Route: /contracts/new
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContractForm } from "@/components/contracts/ContractForm";
import { useContractStore } from "@/store/contractStore";
import type { ContractFormData } from "@/types/contract";

export default function ContractCreatePage() {
  const router = useRouter();
  const addContract = useContractStore((s) => s.addContract);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ContractFormData) => {
    setIsLoading(true);
    try {
      await addContract(data);
      toast.success("Tạo hợp đồng thành công");
      router.push("/contracts");
    } catch {
      toast.error("Không thể tạo hợp đồng. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "Hợp đồng", href: "/contracts" },
          { label: "Tạo mới" },
        ]}
      />
      <PageHeader
        title="Tạo hợp đồng mới"
        description="Nhập thông tin hợp đồng lao động"
      />
      <ContractForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
