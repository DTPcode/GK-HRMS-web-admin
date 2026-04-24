"use client";

// ============================================================================
// GK-HRMS — useDebounce Hook
// Debounce giá trị input — tránh gọi API liên tục khi user đang gõ
// ============================================================================

import { useEffect, useState } from "react";

/**
 * Debounce 1 giá trị với delay (ms).
 * Dùng cho search input: chỉ cập nhật filter sau khi user ngừng gõ.
 *
 * @example
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 300);
 * // debouncedSearch chỉ thay đổi sau 300ms kể từ lần gõ cuối
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: clear timer cũ khi value thay đổi trước khi hết delay
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
