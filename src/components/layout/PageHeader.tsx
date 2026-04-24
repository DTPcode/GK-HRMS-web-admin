"use client";

// ============================================================================
// GK-HRMS — PageHeader
// Tiêu đề trang + mô tả + action buttons (bên phải)
// Responsive: stack trên mobile, inline trên desktop
// ============================================================================

interface PageHeaderProps {
  /** Tiêu đề chính (vd: "Danh sách nhân viên") */
  title: string;
  /** Mô tả ngắn dưới tiêu đề */
  description?: string;
  /** Action buttons render bên phải (vd: nút "Thêm nhân viên") */
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
