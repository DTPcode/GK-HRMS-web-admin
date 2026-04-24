"use client";

// ============================================================================
// GK-HRMS — ReportPageClient (Orchestrator)
// 3 tabs: Biến Động Nhân Sự | Thống Kê Lương | Báo Cáo Chấm Công
// Fetch cross-store data on mount
// ============================================================================

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { HeadcountChart } from "@/components/reports/HeadcountChart";
import { SalarySummaryTable } from "@/components/reports/SalarySummaryTable";
import { TurnoverChart } from "@/components/reports/TurnoverChart";
import { useEmployeeStore } from "@/store/employeeStore";
import { usePayrollStore } from "@/store/payrollStore";
import { useAttendanceStore } from "@/store/attendanceStore";

export function ReportPageClient() {
  // ── Store selectors (react to role switch → refetch with correct branch filter) ──
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const fetchPayroll = usePayrollStore((s) => s.fetchPayroll);
  const fetchAttendance = useAttendanceStore((s) => s.fetchAttendance);

  // ── Fetch all data on mount ──
  useEffect(() => {
    fetchEmployees();
    fetchPayroll();
    fetchAttendance();
  }, [fetchEmployees, fetchPayroll, fetchAttendance]);

  return (
    <div>
      <BreadCrumb items={[{ label: "Báo cáo" }]} />
      <PageHeader
        title="Báo cáo tổng hợp"
        description="Phân tích nhân sự, lương, chấm công"
      />

      <Tabs defaultValue="headcount">
        <TabsList>
          <TabsTrigger value="headcount" className="gap-1.5">
            📊 Biến động nhân sự
          </TabsTrigger>
          <TabsTrigger value="salary" className="gap-1.5">
            💰 Thống kê lương
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            📋 Chấm công
          </TabsTrigger>
        </TabsList>

        <TabsContent value="headcount" className="mt-4">
          <HeadcountChart />
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <SalarySummaryTable />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <TurnoverChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
