"use client";

// ============================================================================
// GK-HRMS — BreadCrumb
// Breadcrumb navigation — auto-generate từ pathname hoặc truyền manual
// ============================================================================

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadCrumbItem {
  label: string;
  href?: string;
}

interface BreadCrumbProps {
  items: BreadCrumbItem[];
}

export function BreadCrumb({ items }: BreadCrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm">
        {/* Home link luôn hiển thị đầu tiên */}
        <li>
          <Link
            href="/dashboard"
            className="flex items-center text-slate-400 hover:text-slate-600"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              {isLast || !item.href ? (
                <span className="font-medium text-slate-700">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
