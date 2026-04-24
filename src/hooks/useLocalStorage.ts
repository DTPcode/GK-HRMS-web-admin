"use client";

// ============================================================================
// GK-HRMS — useLocalStorage Hook
// Persist state vào localStorage — survive page refresh
// ============================================================================

import { useCallback, useState } from "react";

/**
 * useState nhưng sync với localStorage.
 * Dùng cho: mock role, sidebar collapse state, user preferences.
 *
 * @param key - localStorage key
 * @param defaultValue - giá trị mặc định nếu key chưa tồn tại
 *
 * @example
 * const [collapsed, setCollapsed] = useLocalStorage("sidebar_collapsed", false);
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Lazy initializer: chỉ đọc localStorage 1 lần khi mount
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      // JSON parse lỗi → fallback về default
      console.warn(`[useLocalStorage] Failed to parse key "${key}"`);
      return defaultValue;
    }
  });

  // Setter: cập nhật cả state lẫn localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          console.warn(`[useLocalStorage] Failed to set key "${key}"`);
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
