"use client";

// ============================================================================
// GK-HRMS — OffboardingChecklist
// Dialog checklist trước khi complete offboarding
// Phải tick đủ 4 mục + nhập handoverNote mới enable nút xác nhận
// ============================================================================

import { useState, useCallback } from "react";
import { ClipboardCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ResignationRequest } from "@/types/offboarding";

// ---------------------------------------------------------------------------
// Checklist items
// ---------------------------------------------------------------------------

const CHECKLIST_ITEMS = [
  { id: "uniform", label: "Đã thu hồi đồng phục, thẻ nhân viên" },
  { id: "handover", label: "Đã bàn giao công việc cho người thay thế" },
  { id: "payment", label: "Đã thanh toán lương và các khoản còn lại" },
  { id: "account", label: "Đã vô hiệu hóa tài khoản hệ thống" },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OffboardingChecklistProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ResignationRequest | null;
  onComplete: (id: string, note: string) => void | Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OffboardingChecklist({
  open,
  onOpenChange,
  request,
  onComplete,
  loading = false,
}: OffboardingChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  const allChecked = checked.size === CHECKLIST_ITEMS.length;
  const canSubmit = allChecked && note.trim().length > 0;

  const handleToggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!request || !canSubmit) return;
    await onComplete(request.id, note.trim());
    // Reset state
    setChecked(new Set());
    setNote("");
  }, [request, canSubmit, note, onComplete]);

  // Reset khi đóng
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setChecked(new Set());
        setNote("");
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            Hoàn tất bàn giao
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info */}
          <p className="text-sm text-slate-500">
            Vui lòng xác nhận đã hoàn tất tất cả các mục sau trước khi kết thúc
            quy trình nghỉ việc:
          </p>

          {/* Checklist */}
          <div className="space-y-3">
            {CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => handleToggle(item.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${(checked.size / CHECKLIST_ITEMS.length) * 100}%`,
                }}
              />
            </div>
            <span>
              {checked.size}/{CHECKLIST_ITEMS.length}
            </span>
          </div>

          {/* Handover note */}
          <div>
            <label
              htmlFor="handover-note"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Ghi chú bàn giao <span className="text-red-500">*</span>
            </label>
            <textarea
              id="handover-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ghi chú chi tiết về bàn giao công việc, tài sản, v.v."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? "Đang xử lý..." : "Xác nhận hoàn tất"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
