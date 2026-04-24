"use client";

// ============================================================================
// GK-HRMS — SalaryDisplay
// Hiển thị lương có kiểm soát quyền:
//   - super_admin, hr_admin, accountant, director → thấy số thật
//   - branch_manager → thấy "***"
// CONSTRAINT: không log giá trị lương thật vào console
// ============================================================================

import { useAccountStore } from "@/store/accountStore";
import { formatCurrency } from "@/lib/utils";
import type { UserRole } from "@/types/account";

/** Roles được phép xem lương thật */
const SALARY_VISIBLE_ROLES: ReadonlySet<UserRole> = new Set([
  "super_admin",
  "hr_admin",
  "accountant",
  "director",
]);

interface SalaryDisplayProps {
  /** Số tiền lương (VND) */
  salary: number;
  /** Override role — mặc định lấy từ store */
  userRole?: UserRole;
  /** Class bổ sung */
  className?: string;
}

/**
 * Component hiển thị lương có kiểm soát bảo mật.
 *
 * Tại sao dùng component thay vì utility function:
 *   - Cần đọc reactive state (currentUser.role) từ store
 *   - Đảm bảo re-render khi switchRole() trong dev mode
 *   - Tập trung logic mask 1 chỗ — dễ audit security
 *
 * @example
 * <SalaryDisplay salary={12000000} />
 * // super_admin thấy: "12.000.000 ₫"
 * // branch_manager thấy: "***"
 */
export function SalaryDisplay({
  salary,
  userRole,
  className,
}: SalaryDisplayProps) {
  const currentRole = useAccountStore((s) => s.currentUser.role);
  const effectiveRole = userRole ?? currentRole;

  const canViewSalary = SALARY_VISIBLE_ROLES.has(effectiveRole);

  if (!canViewSalary) {
    return (
      <span className={className} aria-label="Lương bị ẩn" title="Bạn không có quyền xem thông tin lương">
        ***
      </span>
    );
  }

  return <span className={className}>{formatCurrency(salary)}</span>;
}
