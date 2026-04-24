"use client";

// ============================================================================
// GK-HRMS — MaskedNationalId
// Hiển thị CCCD có kiểm soát quyền:
//   - super_admin, hr_admin → hiện đầy đủ
//   - Các role khác → hiện "••••••••" + 4 số cuối
// CONSTRAINT: không log giá trị thật vào console
// ============================================================================

import { useAccountStore } from "@/store/accountStore";
import { maskNationalId } from "@/lib/utils";
import type { UserRole } from "@/types/account";

/** Roles được phép xem CCCD đầy đủ */
const NATIONAL_ID_VISIBLE_ROLES: ReadonlySet<UserRole> = new Set([
  "super_admin",
  "hr_admin",
]);

interface MaskedNationalIdProps {
  /** Số CCCD đầy đủ */
  value: string;
  /** Override role — mặc định lấy từ store */
  userRole?: UserRole;
  /** Class bổ sung */
  className?: string;
}

/**
 * Component hiển thị CCCD có kiểm soát bảo mật.
 *
 * Tại sao tách thành component:
 *   - Dữ liệu CCCD nhạy cảm theo SRS → cần kiểm soát hiển thị
 *   - Reactive: re-render khi switchRole() trong dev mode
 *   - Tập trung logic mask 1 chỗ → dễ audit bảo mật
 *
 * @example
 * <MaskedNationalId value="012345678901" />
 * // super_admin thấy: "012345678901"
 * // branch_manager thấy: "••••••••8901"
 */
export function MaskedNationalId({
  value,
  userRole,
  className,
}: MaskedNationalIdProps) {
  const currentRole = useAccountStore((s) => s.currentUser.role);
  const effectiveRole = userRole ?? currentRole;

  const canViewFull = NATIONAL_ID_VISIBLE_ROLES.has(effectiveRole);

  return (
    <span
      className={className}
      aria-label={canViewFull ? "CCCD" : "CCCD đã che"}
      title={canViewFull ? undefined : "Bạn không có quyền xem CCCD đầy đủ"}
    >
      {canViewFull ? value : maskNationalId(value)}
    </span>
  );
}
