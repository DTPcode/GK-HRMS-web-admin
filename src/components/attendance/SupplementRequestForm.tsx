"use client";

// ============================================================================
// GK-HRMS — SupplementRequestForm
// Form tạo yêu cầu bổ sung công
// Conditional fields: checkIn/checkOut tùy theo type
// ============================================================================

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SUPPLEMENT_TYPE_CONFIG } from "@/types/supplement";
import type { AttendanceSupplementType } from "@/types/supplement";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const supplementInputSchema = z
  .object({
    employeeId: z
      .string({ error: "Nhân viên là bắt buộc" })
      .min(1, "Vui lòng chọn nhân viên"),
    type: z.enum(
      [
        "late_explanation",
        "early_leave",
        "missing_checkin",
        "missing_checkout",
        "overtime_request",
      ],
      { error: "Loại bổ sung là bắt buộc" }
    ),
    date: z
      .string({ error: "Ngày là bắt buộc" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),
    requestedCheckIn: z.string().nullable(),
    requestedCheckOut: z.string().nullable(),
    reason: z
      .string({ error: "Lý do là bắt buộc" })
      .min(10, "Lý do phải có ít nhất 10 ký tự"),
  })
  .refine(
    (data) => {
      // date không được là tương lai
      const today = new Date().toISOString().slice(0, 10);
      return data.date <= today;
    },
    { message: "Ngày bổ sung không được là ngày tương lai", path: ["date"] }
  );

type SupplementInputData = z.infer<typeof supplementInputSchema>;

// ---------------------------------------------------------------------------
// Type → cần field nào?
// ---------------------------------------------------------------------------

const NEEDS_CHECK_IN = new Set<string>([
  "late_explanation",
  "missing_checkin",
  "overtime_request",
]);
const NEEDS_CHECK_OUT = new Set<string>([
  "early_leave",
  "missing_checkout",
  "overtime_request",
]);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SupplementRequestFormProps {
  /** employeeId — nếu tạo cho mình (pre-filled) */
  employeeId: string;
  onSubmit: (data: SupplementInputData) => void | Promise<void>;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SupplementRequestForm({
  employeeId,
  onSubmit,
  isLoading = false,
}: SupplementRequestFormProps) {
  const form = useForm<SupplementInputData>({
    resolver: zodResolver(supplementInputSchema),
    defaultValues: {
      employeeId,
      type: "late_explanation",
      date: "",
      requestedCheckIn: null,
      requestedCheckOut: null,
      reason: "",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const watchedType = useWatch({ control, name: "type" });
  const showCheckIn = NEEDS_CHECK_IN.has(watchedType ?? "");
  const showCheckOut = NEEDS_CHECK_OUT.has(watchedType ?? "");

  const supplementTypes = Object.entries(SUPPLEMENT_TYPE_CONFIG) as [
    AttendanceSupplementType,
    (typeof SUPPLEMENT_TYPE_CONFIG)[AttendanceSupplementType],
  ][];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("employeeId")} />

      {/* Loại bổ sung */}
      <div>
        <label
          htmlFor="supp-type"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Loại yêu cầu <span className="text-red-500">*</span>
        </label>
        <select
          id="supp-type"
          {...register("type")}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {supplementTypes.map(([value, config]) => (
            <option key={value} value={value}>
              {config.label_vi}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Ngày */}
      <div>
        <label
          htmlFor="supp-date"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Ngày cần bổ sung <span className="text-red-500">*</span>
        </label>
        <Input
          id="supp-date"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          {...register("date")}
        />
        {errors.date && (
          <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
        )}
      </div>

      {/* Giờ vào — conditional */}
      {showCheckIn && (
        <div>
          <label
            htmlFor="supp-checkin"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {watchedType === "overtime_request"
              ? "Giờ bắt đầu OT"
              : "Giờ vào (yêu cầu)"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <Input id="supp-checkin" type="time" {...register("requestedCheckIn")} />
          {errors.requestedCheckIn && (
            <p className="mt-1 text-xs text-red-500">
              {errors.requestedCheckIn.message}
            </p>
          )}
        </div>
      )}

      {/* Giờ ra — conditional */}
      {showCheckOut && (
        <div>
          <label
            htmlFor="supp-checkout"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {watchedType === "overtime_request"
              ? "Giờ kết thúc OT"
              : "Giờ ra (yêu cầu)"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <Input
            id="supp-checkout"
            type="time"
            {...register("requestedCheckOut")}
          />
          {errors.requestedCheckOut && (
            <p className="mt-1 text-xs text-red-500">
              {errors.requestedCheckOut.message}
            </p>
          )}
        </div>
      )}

      {/* Lý do */}
      <div>
        <label
          htmlFor="supp-reason"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Lý do <span className="text-red-500">*</span>
        </label>
        <textarea
          id="supp-reason"
          {...register("reason")}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Mô tả chi tiết lý do bổ sung (tối thiểu 10 ký tự)"
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gửi yêu cầu
        </Button>
      </div>
    </form>
  );
}
