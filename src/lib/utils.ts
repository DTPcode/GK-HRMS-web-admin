// ============================================================================
// GK-HRMS — Utility Functions
// Helpers dùng chung: className merge, format tiền/ngày, mask dữ liệu
// ============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

/** Merge Tailwind classes — dùng kết hợp clsx + twMerge để tránh conflict */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format số tiền VND: 8000000 → "8.000.000 ₫" */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/** Format ngày: "2024-01-15" → "15/01/2024" */
export function formatDate(date: string | Date): string {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return format(parsed, "dd/MM/yyyy", { locale: vi });
}

/** Format tháng: "2024-01" → "01/2024" */
export function formatMonth(date: string | Date): string {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return format(parsed, "MM/yyyy", { locale: vi });
}

/** Che CCCD: "012345678901" → "********8901" */
export function maskNationalId(id: string): string {
  if (id.length <= 4) return id;
  return "•".repeat(id.length - 4) + id.slice(-4);
}

/** Lấy chữ cái đầu tên: "Nguyễn Văn An" → "NA" (first + last) */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Tạo ID duy nhất: generateId("emp") → "emp-1713700000000" */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

/**
 * Sleep helper — dùng để fake loading delay khi mock API
 * Chỉ dùng ở dev, production không cần
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
