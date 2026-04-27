// ============================================================================
// GK-HRMS — Notification Helpers
// Fire-and-forget helper functions — gọi từ các stores
// ============================================================================

import { useNotificationStore } from "@/store/notificationStore";
import { BRANCH_LIST } from "@/types/employee";
import type { Transfer } from "@/types/employee";
import type { ResignationRequest } from "@/types/offboarding";

function notify(
  data: Parameters<ReturnType<typeof useNotificationStore.getState>["createNotification"]>[0]
) {
  return useNotificationStore.getState().createNotification(data);
}

function branchName(id: string | null): string {
  if (!id) return "—";
  return BRANCH_LIST.find((b) => b.id === id)?.name.replace("Gia Khánh - ", "") ?? id;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return d;
  }
}

// ─── Transfer notifications ─────────────────────────────────────────────────

export function notifyTransferRequested(transfer: Transfer) {
  notify({
    type: "transfer_requested",
    title: transfer.type === "permanent"
      ? "Đề xuất điều chuyển nhân sự mới"
      : "Đề xuất cho mượn nhân sự mới",
    message: `Chi nhánh ${branchName(transfer.requestedByBranchId)} cần bổ sung ${transfer.requiredQuantity} ${transfer.requiredPosition} từ ngày ${formatDate(transfer.requestedStartDate)}.`,
    recipientType: "hr_admin",
    recipientBranchId: null,
    relatedModule: "transfers",
    relatedId: transfer.id,
  }).catch(console.error);
}

export function notifyTransferDispatched(transfer: Transfer) {
  notify({
    type: "transfer_dispatched",
    title: "HR yêu cầu hỗ trợ nhân sự",
    message: `HR đề nghị chi nhánh bạn ${transfer.type === "permanent" ? "điều chuyển" : "cho mượn"} ${transfer.requiredPosition} sang ${branchName(transfer.requestedByBranchId)}.${transfer.hrDispatchNote ? ` Ghi chú: ${transfer.hrDispatchNote}` : ""}`,
    recipientType: "specific_branch",
    recipientBranchId: transfer.sourceBranchId,
    relatedModule: "transfers",
    relatedId: transfer.id,
  }).catch(console.error);
}

export function notifyTransferSourceAccepted(transfer: Transfer) {
  notify({
    type: "transfer_source_accepted",
    title: "Chi nhánh đã đồng ý điều chuyển",
    message: `${branchName(transfer.sourceBranchId)} đồng ý. Nhân viên: ${transfer.employeeName ?? "—"}. Vui lòng xác nhận chính thức.`,
    recipientType: "hr_admin",
    recipientBranchId: null,
    relatedModule: "transfers",
    relatedId: transfer.id,
  }).catch(console.error);
}

export function notifyTransferSourceRejected(transfer: Transfer) {
  notify({
    type: "transfer_source_rejected",
    title: "Chi nhánh từ chối điều chuyển",
    message: `${branchName(transfer.sourceBranchId)} từ chối: ${transfer.sourceResponseNote ?? "Không có lý do"}`,
    recipientType: "hr_admin",
    recipientBranchId: null,
    relatedModule: "transfers",
    relatedId: transfer.id,
  }).catch(console.error);
}

export function notifyTransferExecuted(transfer: Transfer) {
  // Thông báo chi nhánh nguồn
  notify({
    type: "transfer_executed",
    title: transfer.type === "permanent"
      ? `Xác nhận điều chuyển — ${transfer.employeeName}`
      : `Xác nhận cho mượn — ${transfer.employeeName}`,
    message: `${transfer.employeeName} sẽ ${transfer.type === "permanent" ? "chuyển sang" : "hỗ trợ"} ${branchName(transfer.toBranchId)} từ ngày ${formatDate(transfer.effectiveDate)}.`,
    recipientType: "specific_branch",
    recipientBranchId: transfer.fromBranchId,
    relatedModule: "transfers",
    relatedId: transfer.id,
  }).catch(console.error);

  // Thông báo chi nhánh đích
  notify({
    type: "transfer_executed",
    title: `Tiếp nhận nhân sự — ${transfer.employeeName}`,
    message: `${transfer.employeeName} (${transfer.requiredPosition}) sẽ ${transfer.type === "permanent" ? "chuyển về" : "hỗ trợ"} chi nhánh bạn từ ngày ${formatDate(transfer.effectiveDate)}.`,
    recipientType: "specific_branch",
    recipientBranchId: transfer.toBranchId,
    relatedModule: "transfers",
    relatedId: transfer.id,
  }).catch(console.error);
}

// ─── Offboarding notifications ──────────────────────────────────────────────

export function notifyResignationSubmitted(request: ResignationRequest, employeeName: string) {
  notify({
    type: "resignation_submitted",
    title: "Đơn nghỉ việc mới",
    message: `${employeeName} đã nộp đơn nghỉ việc. Ngày làm cuối: ${formatDate(request.lastWorkingDate)}.`,
    recipientType: "hr_admin",
    recipientBranchId: null,
    relatedModule: "offboarding",
    relatedId: request.id,
  }).catch(console.error);
}

export function notifyResignationApproved(request: ResignationRequest, employeeName: string, branchId: string) {
  notify({
    type: "resignation_approved",
    title: "Đơn nghỉ việc đã được duyệt",
    message: `HR đã duyệt đơn nghỉ việc của ${employeeName}. Ngày làm cuối: ${formatDate(request.lastWorkingDate)}. Vui lòng chuẩn bị bàn giao.`,
    recipientType: "specific_branch",
    recipientBranchId: branchId,
    relatedModule: "offboarding",
    relatedId: request.id,
  }).catch(console.error);
}

export function notifyResignationRejected(request: ResignationRequest, employeeName: string, branchId: string) {
  notify({
    type: "resignation_rejected",
    title: "Đơn nghỉ việc bị từ chối",
    message: `HR đã từ chối đơn nghỉ việc của ${employeeName}.`,
    recipientType: "specific_branch",
    recipientBranchId: branchId,
    relatedModule: "offboarding",
    relatedId: request.id,
  }).catch(console.error);
}

// ─── Payroll notifications ──────────────────────────────────────────────────

export function notifyPayrollDraftCreated(month: string) {
  notify({
    type: "payroll_draft_created",
    title: `Bảng lương tháng ${month} đã được tạo`,
    message: "Vui lòng kiểm tra và trình duyệt.",
    recipientType: "accountant",
    recipientBranchId: null,
    relatedModule: "payroll",
    relatedId: month,
  }).catch(console.error);
}

export function notifyPayrollApproved(month: string) {
  notify({
    type: "payroll_approved",
    title: `Bảng lương tháng ${month} đã được duyệt`,
    message: "Ban Giám đốc đã phê duyệt. Có thể tiến hành chi lương.",
    recipientType: "accountant",
    recipientBranchId: null,
    relatedModule: "payroll",
    relatedId: month,
  }).catch(console.error);
}

// ─── Contract notifications ─────────────────────────────────────────────────

export function notifyContractExpiring(contractId: string, employeeName: string, endDate: string, daysLeft: number) {
  notify({
    type: daysLeft <= 7 ? "contract_expiring_7" : "contract_expiring_30",
    title: `Hợp đồng sắp hết hạn — còn ${daysLeft} ngày`,
    message: `Hợp đồng của ${employeeName} sẽ hết hạn vào ${formatDate(endDate)}.`,
    recipientType: "hr_admin",
    recipientBranchId: null,
    relatedModule: "contracts",
    relatedId: contractId,
  }).catch(console.error);
}

// ─── Reward / Discipline notifications ──────────────────────────────────────

export function notifyRewardAdded(rewardId: string, employeeName: string, title: string, branchId: string) {
  notify({
    type: "reward_added",
    title: "Khen thưởng mới",
    message: `HR đã ghi nhận khen thưởng cho ${employeeName}: ${title}.`,
    recipientType: "specific_branch",
    recipientBranchId: branchId,
    relatedModule: "rewards",
    relatedId: rewardId,
  }).catch(console.error);
}

export function notifyDisciplineAdded(disciplineId: string, employeeName: string, title: string, branchId: string) {
  notify({
    type: "discipline_added",
    title: "Kỷ luật mới",
    message: `HR đã ghi nhận kỷ luật cho ${employeeName}: ${title}.`,
    recipientType: "specific_branch",
    recipientBranchId: branchId,
    relatedModule: "rewards",
    relatedId: disciplineId,
  }).catch(console.error);
}
