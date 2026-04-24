# GK-HRMS Web Admin — Tài liệu Dự án

> **Phiên bản**: 1.0.0  
> **Cập nhật lần cuối**: 24/04/2026  
> **Tác giả**: GK-HRMS Dev Team

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Chi tiết từng file](#3-chi-tiết-từng-file)
4. [Data Flow](#4-data-flow)
5. [RBAC & Phân quyền](#5-rbac--phân-quyền)
6. [API Endpoints](#6-api-endpoints)
7. [Hướng dẫn phát triển](#7-hướng-dẫn-phát-triển)

---

## 1. Tổng quan dự án

### 1.1 Giới thiệu

| Mục | Chi tiết |
|-----|----------|
| **Tên dự án** | GK-HRMS Web Admin |
| **Mục đích** | Hệ thống quản lý nhân sự cho chuỗi nhà hàng Lẩu Nấm Gia Khánh |
| **Đối tượng sử dụng** | Quản trị viên, HR, Kế toán, Quản lý chi nhánh, Ban Giám đốc |
| **Môi trường** | Web browser (desktop-first, responsive) |

### 1.2 Tech Stack

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Framework | Next.js (App Router) | 16.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 |
| UI Library | shadcn/ui | latest |
| State Management | Zustand | v5 |
| Form | React Hook Form + Zod | v4 |
| Toast | Sonner | latest |
| Icons | Lucide React | latest |
| Mock API | json-server | localhost:3001 |

### 1.3 Sơ đồ kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js App Router                       │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐  │  │
│  │  │  (auth)  │  │  (main)  │  │    middleware.ts     │  │  │
│  │  │  /login  │  │  /dash   │  │  Route protection   │  │  │
│  │  │         │  │  /emp    │  │  Cookie check        │  │  │
│  │  │         │  │  /att    │  └─────────────────────┘  │  │
│  │  │         │  │  /pay    │                           │  │
│  │  │         │  │  /acc    │                           │  │
│  │  └─────────┘  └──────────┘                           │  │
│  │       │              │                                │  │
│  │       ▼              ▼                                │  │
│  │  LoginForm     PageClient Components                  │  │
│  │       │         ┌────┴─────┐                         │  │
│  │       │         │          │                          │  │
│  │       ▼         ▼          ▼                          │  │
│  │  ┌──────────────────────────────┐                    │  │
│  │  │      Zustand Stores          │                    │  │
│  │  │  ┌─────────┐ ┌───────────┐   │                   │  │
│  │  │  │employee  │ │ account   │   │                   │  │
│  │  │  │contract  │ │ payroll   │   │                   │  │
│  │  │  │attendance│ │           │   │                   │  │
│  │  │  └─────────┘ └───────────┘   │                   │  │
│  │  │       │  guardPermission()   │                    │  │
│  │  └───────┼──────────────────────┘                    │  │
│  │          ▼                                            │  │
│  │  ┌──────────────────┐                                │  │
│  │  │  json-server API │ ← Mock (localhost:3001)        │  │
│  │  │  /employees      │                                │  │
│  │  │  /contracts      │                                │  │
│  │  │  /attendance     │                                │  │
│  │  │  /payroll        │                                │  │
│  │  │  /accounts       │                                │  │
│  │  │  /leaves         │                                │  │
│  │  └──────────────────┘                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Danh sách 7 Modules

| # | Module | Route | Mô tả |
|---|--------|-------|-------|
| 1 | **Dashboard** | `/dashboard` | Tổng quan: stat cards, phòng ban, hoạt động gần đây |
| 2 | **Nhân viên** | `/employees` | CRUD hồ sơ NV, lọc/tìm kiếm, xem chi tiết |
| 3 | **Hợp đồng** | `/contracts` | CRUD hợp đồng, gia hạn, theo dõi hết hạn |
| 4 | **Chấm công** | `/attendance` | Bảng chấm công, duyệt nghỉ phép |
| 5 | **Tính lương** | `/payroll` | Tạo bảng lương, workflow duyệt/chi, xuất Excel |
| 6 | **Tài khoản** | `/accounts` | CRUD tài khoản, phân quyền RBAC |
| 7 | **Báo cáo** | `/reports` | Biểu đồ nhân sự, bảng tổng hợp lương |

---

## 2. Cấu trúc thư mục

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — HTML shell + font
│   ├── page.tsx                  # Root redirect → /login
│   ├── globals.css               # Tailwind v4 + custom styles
│   │
│   ├── (auth)/                   # Route group: KHÔNG sidebar/topbar
│   │   ├── layout.tsx            # Auth layout — chỉ Toaster
│   │   └── login/
│   │       └── page.tsx          # Trang đăng nhập
│   │
│   └── (main)/                   # Route group: CÓ sidebar/topbar
│       ├── layout.tsx            # Main layout — Sidebar + Topbar + content
│       ├── dashboard/page.tsx    # Dashboard
│       ├── employees/
│       │   ├── page.tsx          # Danh sách NV
│       │   ├── new/page.tsx      # Thêm NV mới
│       │   └── [id]/
│       │       ├── page.tsx      # Chi tiết NV
│       │       └── edit/page.tsx # Sửa NV
│       ├── contracts/
│       │   ├── page.tsx          # Danh sách hợp đồng
│       │   └── new/page.tsx      # Tạo hợp đồng mới
│       ├── attendance/page.tsx   # Chấm công + nghỉ phép
│       ├── payroll/page.tsx      # Tính lương
│       ├── accounts/page.tsx     # Quản lý tài khoản
│       └── reports/page.tsx      # Báo cáo
│
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx         # Form đăng nhập + mock credentials
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx           # Navigation chính, RBAC filter, responsive
│   │   ├── Topbar.tsx            # Header: breadcrumb, user info, role switcher
│   │   ├── BreadCrumb.tsx        # Breadcrumb tự động theo pathname
│   │   └── PageHeader.tsx        # Header trang: title + description + actions
│   │
│   ├── dashboard/
│   │   ├── DashboardClient.tsx   # Stat cards + skeleton loading
│   │   ├── DeptBreakdown.tsx     # Bảng NV theo phòng ban
│   │   └── RecentActivity.tsx    # Timeline hoạt động gần đây
│   │
│   ├── employees/
│   │   ├── EmployeePageClient.tsx # Trang chính: table/grid + CRUD dialog
│   │   ├── EmployeeTable.tsx     # Bảng danh sách NV
│   │   ├── EmployeeGrid.tsx      # Dạng card grid
│   │   ├── EmployeeFilter.tsx    # Bộ lọc: search, dept, branch, status
│   │   ├── EmployeeForm.tsx      # Form thêm/sửa NV (React Hook Form + Zod)
│   │   └── EmployeeDetail.tsx    # Chi tiết NV + SalaryDisplay
│   │
│   ├── contracts/
│   │   ├── ContractPageClient.tsx # Trang chính: table + CRUD
│   │   ├── ContractTable.tsx     # Bảng hợp đồng
│   │   ├── ContractForm.tsx      # Form tạo/sửa hợp đồng
│   │   └── RenewContractDialog.tsx # Dialog gia hạn hợp đồng
│   │
│   ├── attendance/
│   │   ├── AttendancePageClient.tsx # Tabs: chấm công + nghỉ phép
│   │   ├── MonthlyAttendanceGrid.tsx # Lưới chấm công theo tháng
│   │   ├── LeaveRequestTable.tsx # Bảng đơn nghỉ phép + duyệt
│   │   └── ShiftBadge.tsx        # Badge hiển thị ca làm
│   │
│   ├── payroll/
│   │   ├── PayrollPageClient.tsx # Trang chính: stepper + table
│   │   ├── PayrollTable.tsx      # Bảng lương + action buttons
│   │   ├── PayrollStatusStepper.tsx # Filter tabs theo trạng thái
│   │   ├── SalaryBreakdownModal.tsx # Modal chi tiết lương
│   │   └── ConfirmPaymentDialog.tsx # Dialog xác nhận chi lương
│   │
│   ├── accounts/
│   │   ├── AccountPageClient.tsx # Trang chính: table + CRUD dialog
│   │   ├── AccountTable.tsx      # Bảng tài khoản + role badge
│   │   ├── AccountForm.tsx       # Form tạo/sửa tài khoản
│   │   └── RolePermissionMatrix.tsx # Ma trận quyền theo role
│   │
│   ├── reports/
│   │   ├── ReportPageClient.tsx  # Trang báo cáo tổng hợp
│   │   ├── HeadcountChart.tsx    # Biểu đồ nhân sự
│   │   ├── SalarySummaryTable.tsx # Bảng tổng hợp lương
│   │   └── TurnoverChart.tsx     # Biểu đồ biến động nhân sự
│   │
│   ├── shared/                   # Components dùng chung
│   │   ├── ProtectedRoute.tsx    # Route guard — redirect nếu không có quyền
│   │   ├── SalaryDisplay.tsx     # Hiển thị lương — ẩn theo role
│   │   ├── MaskedNationalId.tsx  # Ẩn CCCD — chỉ hiện 4 số cuối
│   │   ├── LanguageSwitcher.tsx  # Chuyển role (dev) + ngôn ngữ
│   │   ├── RoleSwitcher.tsx      # Quick role switch cho dev/test
│   │   ├── DataExportButton.tsx  # Xuất Excel/CSV
│   │   ├── ConfirmDialog.tsx     # Dialog xác nhận hành động
│   │   ├── EmptyState.tsx        # Trạng thái trống
│   │   ├── ErrorMessage.tsx      # Hiển thị lỗi
│   │   ├── Pagination.tsx        # Phân trang
│   │   ├── StatCard.tsx          # Card thống kê
│   │   ├── StatCardSkeleton.tsx  # Skeleton cho stat card
│   │   ├── CardSkeleton.tsx      # Skeleton cho card
│   │   └── TableSkeleton.tsx     # Skeleton cho table
│   │
│   └── ui/                       # shadcn/ui primitives
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── skeleton.tsx
│       ├── sonner.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       └── tooltip.tsx
│
├── store/                        # Zustand v5 stores
│   ├── accountStore.ts           # Tài khoản + auth + RBAC
│   ├── employeeStore.ts          # Nhân viên + filter + pagination
│   ├── contractStore.ts          # Hợp đồng + expiring contracts
│   ├── attendanceStore.ts        # Chấm công + nghỉ phép
│   └── payrollStore.ts           # Tính lương + workflow duyệt
│
├── types/                        # Zod schemas + TypeScript types
│   ├── account.ts                # UserAccount, UserRole, RBAC, ROLE_PERMISSIONS
│   ├── employee.ts               # Employee, EmployeeFormData, departments
│   ├── contract.ts               # Contract, ContractFormData
│   ├── attendance.ts             # AttendanceRecord, LeaveRequest
│   ├── payroll.ts                # PayrollRecord, PayrollStatus, PaymentData
│   └── common.ts                 # Shared types: LoadingState, SalaryType, etc.
│
├── hooks/                        # Custom React hooks
│   ├── usePermission.ts          # Check quyền RBAC cho current user
│   ├── useDebounce.ts            # Debounce value (search, filter)
│   └── useLocalStorage.ts        # Persistent state trong localStorage
│
├── lib/                          # Utilities
│   ├── constants.ts              # NAV_ITEMS, labels, colors
│   ├── guardPermission.ts        # Permission guard cho store actions
│   ├── mockAuth.ts               # Mock users + credentials
│   └── utils.ts                  # cn() helper + formatters
│
└── middleware.ts                 # Route protection — cookie check
```

---

## 3. Chi tiết từng file

### 3.1 App Router — Pages

---

#### `app/layout.tsx` — Root Layout
- **Loại**: Layout
- **Tác dụng**: HTML shell tối thiểu — chỉ cung cấp `<html>`, `<body>`, font Inter, globals.css
- **Export**: `RootLayout`, `metadata`
- **Import từ**: `next/font/google`, `globals.css`
- **Lưu ý**: KHÔNG chứa Sidebar/Topbar — những thứ đó nằm trong `(main)/layout.tsx`

---

#### `app/page.tsx` — Root Redirect
- **Loại**: Page
- **Tác dụng**: Redirect `/` → `/login`
- **Export**: `Home`

---

#### `app/(auth)/layout.tsx` — Auth Layout
- **Loại**: Layout
- **Tác dụng**: Layout cho route group `(auth)` — KHÔNG có Sidebar/Topbar, chỉ có Toaster
- **Export**: `AuthLayout`

---

#### `app/(auth)/login/page.tsx` — Login Page
- **Loại**: Page (Server Component)
- **Tác dụng**: Trang đăng nhập — render `LoginForm`, metadata SEO
- **Export**: `LoginPage`, `metadata`

---

#### `app/(main)/layout.tsx` — Main Layout
- **Loại**: Layout
- **Tác dụng**: Layout chính cho tất cả route admin — Sidebar + Topbar + scrollable content
- **Export**: `MainLayout`
- **Import từ**: `Sidebar`, `Topbar`, `Toaster`

---

#### `app/(main)/dashboard/page.tsx` — Dashboard Page
- **Loại**: Page
- **Tác dụng**: Render `DashboardClient`
- **Guard**: Không (Dashboard luôn hiện cho mọi role)

---

#### `app/(main)/employees/page.tsx` — Employees Page
- **Loại**: Page
- **Guard**: `ProtectedRoute module="employees" action="view"`

#### `app/(main)/employees/new/page.tsx` — New Employee
#### `app/(main)/employees/[id]/page.tsx` — Employee Detail
#### `app/(main)/employees/[id]/edit/page.tsx` — Edit Employee

---

#### `app/(main)/contracts/page.tsx` — Contracts Page
- **Guard**: `ProtectedRoute module="contracts" action="view"`

#### `app/(main)/contracts/new/page.tsx` — New Contract

---

#### `app/(main)/attendance/page.tsx`
- **Guard**: `ProtectedRoute module="attendance" action="view"`

#### `app/(main)/payroll/page.tsx`
- **Guard**: `ProtectedRoute module="payroll" action="view"`

#### `app/(main)/accounts/page.tsx`
- **Guard**: `ProtectedRoute module="accounts" action="view"`

#### `app/(main)/reports/page.tsx`
- **Guard**: `ProtectedRoute module="reports" action="view"`

---

### 3.2 Components — Auth

---

#### `components/auth/LoginForm.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Form đăng nhập với Zod validation, mock auth, auto-fill test credentials
- **Export**: `LoginForm`
- **Import từ**: `react-hook-form`, `zod`, `mockAuth`, `accountStore`, `sonner`
- **Được dùng bởi**: `(auth)/login/page.tsx`
- **State**: `showPassword`, `isSubmitting`
- **Lưu ý**: Ghi cookie `mock_current_role` để middleware check. Hiển thị 5 tài khoản test dưới form

---

### 3.3 Components — Layout

---

#### `components/layout/Sidebar.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Navigation chính bên trái, collapse, responsive overlay trên mobile
- **Export**: `Sidebar`, `toggleMobileSidebar`
- **Import từ**: `constants.NAV_ITEMS`, `accountStore`
- **Được dùng bởi**: `(main)/layout.tsx`
- **State**: `collapsed`, `mobileOpen`, `mounted`
- **Lưu ý**: 
  - RBAC filter: chỉ hiện menu items mà role hiện tại có quyền
  - Hydration guard: SSR render mảng rỗng, client mount mới render đúng
  - Icon map: string → Lucide component

---

#### `components/layout/Topbar.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Header: mobile menu trigger, breadcrumb, role switcher, user info
- **Export**: `Topbar`
- **Import từ**: `Sidebar.toggleMobileSidebar`, `BreadCrumb`, `LanguageSwitcher`
- **Được dùng bởi**: `(main)/layout.tsx`

---

#### `components/layout/BreadCrumb.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Breadcrumb tự động dựa trên pathname
- **Export**: `BreadCrumb`
- **Được dùng bởi**: `Topbar`

---

#### `components/layout/PageHeader.tsx`
- **Loại**: Component
- **Tác dụng**: Header trang: title, description, action buttons
- **Export**: `PageHeader`
- **Props**: `title`, `description`, `children` (action buttons)

---

### 3.4 Components — Dashboard

---

#### `components/dashboard/DashboardClient.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Trang dashboard: 4 stat cards + dept breakdown + recent activity + skeleton loading
- **Export**: `DashboardClient`
- **Import từ**: `employeeStore`, `contractStore`, `attendanceStore`
- **State**: Đọc từ 3 stores, tính toán stats + trends
- **Lưu ý**: Dùng `React.memo` cho StatCard để tránh re-render không cần thiết

---

#### `components/dashboard/DeptBreakdown.tsx`
- **Loại**: Component
- **Tác dụng**: Bảng nhân viên theo phòng ban với progress bar

---

#### `components/dashboard/RecentActivity.tsx`
- **Loại**: Component
- **Tác dụng**: Timeline hoạt động gần đây (mock data)

---

### 3.5 Components — Employees

---

#### `components/employees/EmployeePageClient.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Trang chính NV: filter + table/grid toggle + CRUD dialogs + pagination
- **Export**: `EmployeePageClient`
- **Import từ**: `employeeStore`, `usePermission`, `EmployeeFilter`, `EmployeeTable`, `EmployeeForm`
- **State**: `viewMode` (table/grid), `deleteTarget`, dialogs
- **Lưu ý**: Dùng `canCreate/canUpdate/canDelete` từ usePermission để ẩn/hiện buttons

---

#### `components/employees/EmployeeTable.tsx`
- **Loại**: Component
- **Tác dụng**: Bảng danh sách NV: checkbox select, sort, action buttons
- **Props**: `employees`, `onView`, `onEdit`, `onDelete`, `canUpdate`, `canDelete`

---

#### `components/employees/EmployeeGrid.tsx`
- **Loại**: Component
- **Tác dụng**: Card grid view cho danh sách NV

---

#### `components/employees/EmployeeFilter.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Bộ lọc: search debounce 300ms, department, branch, status
- **Import từ**: `employeeStore`, `useDebounce`, `DEPARTMENT_LIST`, `BRANCH_LIST`
- **Lưu ý**: Đọc/ghi store trực tiếp, không nhận props

---

#### `components/employees/EmployeeForm.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Form thêm/sửa NV — React Hook Form + Zod validation
- **Props**: `initialData?` (edit mode), `onSubmit`, `onCancel`

---

#### `components/employees/EmployeeDetail.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Chi tiết NV: thông tin cá nhân, lương (SalaryDisplay), CCCD (MaskedNationalId)
- **Props**: `employeeId`
- **Lưu ý**: Dùng `canUpdate` từ usePermission để hiện/ẩn nút Sửa

---

### 3.6 Components — Contracts

---

#### `components/contracts/ContractPageClient.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Trang hợp đồng: table + CRUD + filter
- **Import từ**: `contractStore`, `usePermission`

---

#### `components/contracts/ContractTable.tsx`
- **Loại**: Component
- **Tác dụng**: Bảng hợp đồng: type badge, status, ngày hết hạn

---

#### `components/contracts/ContractForm.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Form tạo/sửa hợp đồng — link tới employee

---

#### `components/contracts/RenewContractDialog.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Dialog gia hạn hợp đồng: chọn ngày kết thúc mới

---

### 3.7 Components — Attendance

---

#### `components/attendance/AttendancePageClient.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: 2 tabs: Bảng chấm công + Đơn nghỉ phép
- **Import từ**: `attendanceStore`, `usePermission`

---

#### `components/attendance/MonthlyAttendanceGrid.tsx`
- **Loại**: Component
- **Tác dụng**: Lưới chấm công: hàng = NV, cột = ngày trong tháng

---

#### `components/attendance/LeaveRequestTable.tsx`
- **Loại**: Component
- **Tác dụng**: Bảng đơn nghỉ phép: status, approve/reject buttons
- **Lưu ý**: Buttons chỉ hiện khi `canApprove = true`

---

#### `components/attendance/ShiftBadge.tsx`
- **Loại**: Component
- **Tác dụng**: Badge hiển thị ca làm (sáng/chiều/tối)

---

### 3.8 Components — Payroll

---

#### `components/payroll/PayrollPageClient.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Trang lương: month picker, status filter tabs, table, create/approve actions
- **Import từ**: `payrollStore`, `employeeStore`, `usePermission`
- **State**: `selectedMonth`, `statusFilter`
- **Lưu ý**: Workflow: Draft → Pending → Approved → Paid, hỗ trợ Reject

---

#### `components/payroll/PayrollTable.tsx`
- **Loại**: Component
- **Tác dụng**: Bảng lương: tên NV, lương cơ bản, phụ cấp, khấu trừ, thực lãnh, action buttons
- **Lưu ý**: Action buttons thay đổi theo status: Gửi duyệt / Duyệt / Chi lương / Từ chối

---

#### `components/payroll/PayrollStatusStepper.tsx`
- **Loại**: Component
- **Tác dụng**: Filter tabs: All, Draft, Pending, Approved, Paid — với badge count

---

#### `components/payroll/SalaryBreakdownModal.tsx`
- **Loại**: Component
- **Tác dụng**: Modal chi tiết lương: ngày công, OT, phụ cấp, BHXH

---

#### `components/payroll/ConfirmPaymentDialog.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Dialog xác nhận chi lương: phương thức, ngày, ghi chú

---

### 3.9 Components — Accounts

---

#### `components/accounts/AccountPageClient.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Trang quản lý tài khoản: table + create/edit dialog
- **Import từ**: `accountStore`, `usePermission`

---

#### `components/accounts/AccountTable.tsx`
- **Loại**: Component
- **Tác dụng**: Bảng tài khoản: username, role badge, status toggle

---

#### `components/accounts/AccountForm.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Form tạo/sửa tài khoản — 5 roles
- **Lưu ý**: Default role khi tạo mới: `accountant`

---

#### `components/accounts/RolePermissionMatrix.tsx`
- **Loại**: Component
- **Tác dụng**: Ma trận quyền: hàng = module, cột = role, ô = ✓/✗

---

### 3.10 Components — Reports

---

#### `components/reports/ReportPageClient.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Trang báo cáo: biểu đồ + bảng tổng hợp

---

#### `components/reports/HeadcountChart.tsx`, `TurnoverChart.tsx`, `SalarySummaryTable.tsx`
- **Loại**: Component
- **Tác dụng**: Biểu đồ/bảng báo cáo nhân sự và lương

---

### 3.11 Components — Shared

---

#### `components/shared/ProtectedRoute.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Route guard — kiểm tra quyền RBAC, redirect `/dashboard` + toast nếu không có quyền
- **Props**: `module`, `action`, `children`, `fallback?`
- **Import từ**: `usePermission`
- **Được dùng bởi**: TẤT CẢ page files trong `(main)/`

---

#### `components/shared/SalaryDisplay.tsx`
- **Loại**: Component (Client)
- **Tác dụng**: Hiển thị lương có kiểm soát: super_admin/hr_admin/accountant/director → thấy số thật, branch_manager → thấy `***`
- **Props**: `salary`, `className?`
- **Được dùng bởi**: `EmployeeDetail`, `PayrollTable`

---

#### `components/shared/MaskedNationalId.tsx`
- **Loại**: Component
- **Tác dụng**: Ẩn CCCD — chỉ hiện 4 số cuối: `***XXXX`

---

#### `components/shared/DataExportButton.tsx`
- **Loại**: Component
- **Tác dụng**: Xuất dữ liệu ra Excel/CSV — dùng trong payroll, reports

---

#### `components/shared/ConfirmDialog.tsx`
- **Loại**: Component
- **Tác dụng**: Dialog xác nhận hành động nguy hiểm (xóa NV, xóa HĐ...)

---

#### `components/shared/Pagination.tsx`
- **Loại**: Component
- **Tác dụng**: Phân trang — prev/next, page numbers, page size

---

#### Các skeleton components
- `StatCardSkeleton.tsx` — Skeleton cho stat card
- `CardSkeleton.tsx` — Skeleton cho card
- `TableSkeleton.tsx` — Skeleton cho table

---

### 3.12 Stores (Zustand v5)

---

#### `store/accountStore.ts`
- **Loại**: Store
- **State**: `accounts`, `currentUser`, `loading`, `error`
- **Actions**: `fetchAccounts`, `createAccount`, `updateAccount`, `updateRole`, `toggleActive`, `deleteAccount`, `switchRole`
- **Computed**: `hasPermission(module, action)` — kiểm tra RBAC
- **Guard**: `guardPermission()` trên tất cả write actions
- **Lưu ý**: `currentUser` khởi tạo từ `getCurrentMockUser()` (localStorage)

---

#### `store/employeeStore.ts`
- **Loại**: Store
- **State**: `employees`, `selectedIds`, `filter`, `loading`, `error`
- **Actions**: `fetchEmployees`, `addEmployee`, `updateEmployee`, `deleteEmployee`
- **Computed**: `stats()`, `filteredEmployees()`, `getCountByDepartment()`
- **Filter**: search, departmentId, branchId, status, page, pageSize
- **Guard**: `guardPermission()` trên create/update/delete
- **Data scope**: `branch_manager` chỉ thấy NV chi nhánh mình

---

#### `store/contractStore.ts`
- **Loại**: Store
- **State**: `contracts`, `selectedIds`, `loading`, `error`
- **Actions**: `fetchContracts`, `addContract`, `updateContract`, `deleteContract`
- **Computed**: `expiringContracts()` — HĐ sắp hết hạn (30 ngày)
- **Guard**: `guardPermission()` trên create/update/delete
- **Business rule**: không cho 2 HĐ "active" cùng lúc cho 1 NV

---

#### `store/attendanceStore.ts`
- **Loại**: Store
- **State**: `records`, `leaveRequests`, `selectedIds`, `loading`, `error`
- **Actions**: `fetchAttendance`, `addAttendance`, `updateAttendance`, `deleteAttendance`, `fetchLeaveRequests`, `approveLeave`, `rejectLeave`, `bulkApprove`
- **Guard**: `guardPermission()` trên tất cả write actions
- **Data scope**: `branch_manager` chỉ thấy chấm công chi nhánh mình

---

#### `store/payrollStore.ts`
- **Loại**: Store
- **State**: `records`, `monthStatuses`, `loading`, `error`
- **Actions**: `fetchPayroll`, `generatePayroll`, `updatePayroll`, `submitForApproval`, `rejectPayroll`, `approvePayroll`, `markAsPaid`
- **Computed**: `getMonthRecords(month)`, `getStatusCounts(month)`, `calculatePayroll(month)`, `advanceMonthStatus(month)`
- **Guard**: `guardPermission()` trên tất cả write actions
- **Workflow**: Draft → Pending Approval → Approved → Paid (+ Reject → Draft)

---

### 3.13 Types (Zod v4)

---

#### `types/account.ts`
- **Export**: `userRoleSchema`, `UserRole`, `UserAccount`, `AccountFormData`, `ROLE_PERMISSIONS`, `ROLE_CONFIG`
- **5 roles**: super_admin, hr_admin, branch_manager, accountant, director
- **6 modules**: employees, contracts, attendance, payroll, accounts, reports
- **6 actions**: view, create, update, delete, approve, export

---

#### `types/employee.ts`
- **Export**: `Employee`, `EmployeeFormData`, `EmployeeStatus`, `SalaryType`, `DEPARTMENT_LIST`, `BRANCH_LIST`, `STATUS_CONFIG`, `SALARY_TYPE_CONFIG`
- **SalaryType**: Chỉ `monthly` (lương tháng)

---

#### `types/contract.ts`
- **Export**: `Contract`, `ContractFormData`, `ContractType`, `ContractStatus`

---

#### `types/attendance.ts`
- **Export**: `AttendanceRecord`, `AttendanceFormData`, `LeaveRequest`, `ShiftType`

---

#### `types/payroll.ts`
- **Export**: `PayrollRecord`, `PayrollStatus`, `PaymentData`, `MonthStatus`
- **PayrollStatus**: `draft` → `pending_approval` → `approved` → `paid`

---

#### `types/common.ts`
- **Export**: `LoadingState`, `UserRole`, `SalaryType`, `EmployeeStatus`
- **Lưu ý**: Re-export types cho tiện — source of truth vẫn ở từng module type file

---

### 3.14 Hooks

---

#### `hooks/usePermission.ts`
- **Export**: `usePermission(module, action): boolean`
- **Tác dụng**: Check quyền RBAC của current user
- **Module alias**: `employee` → `employees`, `contract` → `contracts` (singular → plural)

---

#### `hooks/useDebounce.ts`
- **Export**: `useDebounce(value, delay): debouncedValue`
- **Tác dụng**: Debounce giá trị — dùng cho search input (300ms)

---

#### `hooks/useLocalStorage.ts`
- **Export**: `useLocalStorage(key, initialValue)`
- **Tác dụng**: State persistent trong localStorage

---

### 3.15 Lib

---

#### `lib/constants.ts`
- **Export**: `NAV_ITEMS`, `EMPLOYEE_STATUS_LABELS`, `EMPLOYEE_STATUS_COLORS`, `SALARY_TYPE_LABELS`, `CONTRACT_TYPE_LABELS`, `ROLE_LABELS`, `ROLE_PERMISSIONS`
- **Tác dụng**: Constants trung tâm cho toàn app
- **NAV_ITEMS**: Định nghĩa sidebar menu + `visibleFor` (RBAC)

---

#### `lib/guardPermission.ts`
- **Export**: `guardPermission(module, action, setError): boolean`
- **Tác dụng**: Permission guard cho store actions — chặn action + set error message
- **Được dùng bởi**: TẤT CẢ 5 stores
- **Lưu ý**: Dùng `require()` dynamic import để tránh circular dependency với accountStore

---

#### `lib/mockAuth.ts`
- **Export**: `MOCK_USERS`, `getCurrentMockUser()`, `setMockRole()`
- **Tác dụng**: Mock auth — 5 tài khoản mẫu, lưu role vào localStorage

---

#### `lib/utils.ts`
- **Export**: `cn()` — Tailwind class merge helper
- **Import từ**: `clsx`, `tailwind-merge`

---

#### `middleware.ts`
- **Loại**: Middleware
- **Tác dụng**: Route protection — check cookie `mock_current_role`
- **Logic**: Chưa login → `/login` | Đã login + vào `/login` → `/dashboard`
- **Public routes**: Chỉ `/login`

---

## 4. Data Flow

### 4.1 Flow chung

```
User Action → Component → usePermission (UI guard)
                ↓
            Store Action → guardPermission (store guard)
                ↓
            Optimistic Update (set state trước)
                ↓
            fetch() → json-server API
                ↓
            Success → state giữ nguyên
            Error   → rollback state + set error
```

### 4.2 Flow đăng nhập

```
User nhập credentials → LoginForm.onSubmit()
    ↓
Check MOCK_CREDENTIALS (username → password)
    ↓
Tìm MOCK_USERS[username]
    ↓
setMockRole(role)                  → localStorage
accountStore.switchRole(role)       → Zustand state
document.cookie = mock_current_role → Cookie cho middleware
    ↓
router.push("/dashboard")
    ↓
middleware.ts check cookie → cho phép → render (main)/layout → Dashboard
```

### 4.3 Flow Employees

```
1. Page load → EmployeePageClient
2. useEffect → fetchEmployees()
3. employeeStore fetch /employees → set state
4. branch_manager? → filter theo branchId
5. filteredEmployees() → apply search, dept, branch, status, pagination
6. Render EmployeeTable/Grid

--- CRUD ---
7. Click "Thêm NV" → canCreate? → EmployeeForm dialog
8. Submit → addEmployee(data) → guardPermission("employees","create")
   → Optimistic: thêm vào state → POST /employees
9. Click "Sửa" → canUpdate? → EmployeeForm dialog (initialData)
10. Submit → updateEmployee(id, data) → guardPermission("employees","update")
    → Optimistic: update state → PATCH /employees/:id
11. Click "Xóa" → canDelete? → ConfirmDialog
12. Confirm → deleteEmployee(id) → guardPermission("employees","delete")
    → Optimistic: xóa khỏi state → DELETE /employees/:id
```

### 4.4 Flow Contracts

```
Tương tự Employees:
fetchContracts → addContract → updateContract → deleteContract
Business rule: không cho 2 HĐ "active" cùng NV
Gia hạn: RenewContractDialog → updateContract(id, { endDate, status })
```

### 4.5 Flow Attendance

```
1. fetchAttendance() → MonthlyAttendanceGrid
2. fetchLeaveRequests() → LeaveRequestTable

--- Duyệt nghỉ phép ---
3. Click "Duyệt" → canApprove? → approveLeave(id)
   → guardPermission("attendance","approve")
   → Optimistic: status = "approved" → PATCH /leaves/:id
4. Click "Từ chối" → rejectLeave(id, reason)
5. "Duyệt tất cả" → bulkApprove(ids)
```

### 4.6 Flow Payroll (Workflow)

```
1. Chọn tháng → fetchPayroll() → filter theo month
2. Click "Tạo bảng lương" → generatePayroll(month)
   → Tính: baseSalary, workDays, OT, allowances, deductions, netSalary
   → Tạo records status="draft"

--- Per-record workflow ---
3. Draft → Click "Gửi duyệt" → submitForApproval(id)
   → status = "pending_approval"

4. Pending → Click "Duyệt" → approvePayroll(id)
   → status = "approved"
   → hoặc Click "Từ chối" → rejectPayroll(id) → status = "draft"

5. Approved → Click "Chi lương" → ConfirmPaymentDialog
   → markAsPaid(id, paymentData) → status = "paid"

--- Filter ---
6. PayrollStatusStepper: All | Draft | Pending | Approved | Paid
   → Client-side filter trong PayrollPageClient useMemo
```

### 4.7 Flow Accounts

```
1. fetchAccounts() → AccountTable
2. CRUD: createAccount, updateAccount, deleteAccount
3. toggleActive(id) → bật/tắt tài khoản
4. switchRole(role) → đổi role (dev/test)
```

---

## 5. RBAC & Phân quyền

### 5.1 Bảng phân quyền chi tiết

| Module | Action | super_admin | hr_admin | branch_manager | accountant | director |
|--------|--------|:-----------:|:--------:|:--------------:|:----------:|:--------:|
| **employees** | view | ✅ | ✅ | ✅ | ✅ | ✅ |
| | create | ✅ | ✅ | ❌ | ❌ | ❌ |
| | update | ✅ | ✅ | ❌ | ❌ | ❌ |
| | delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| | approve | ✅ | ✅ | ❌ | ❌ | ✅ |
| **contracts** | view | ✅ | ✅ | ❌ | ❌ | ✅ |
| | create | ✅ | ✅ | ❌ | ❌ | ❌ |
| | update | ✅ | ✅ | ❌ | ❌ | ❌ |
| | delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| | approve | ✅ | ✅ | ❌ | ❌ | ✅ |
| **attendance** | view | ✅ | ✅ | ✅ | ✅ | ✅ |
| | create | ✅ | ✅ | ✅ | ❌ | ❌ |
| | update | ✅ | ✅ | ✅ | ❌ | ❌ |
| | delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| | approve | ✅ | ✅ | ✅ | ❌ | ✅ |
| **payroll** | view | ✅ | ✅ | ✅ | ✅ | ✅ |
| | create | ✅ | ✅ | ❌ | ✅ | ❌ |
| | update | ✅ | ✅ | ❌ | ✅ | ❌ |
| | delete | ✅ | ✅ | ❌ | ✅ | ❌ |
| | approve | ✅ | ✅ | ❌ | ❌ | ✅ |
| **accounts** | view | ✅ | ✅ | ❌ | ❌ | ✅ |
| | create | ✅ | ✅ | ❌ | ❌ | ❌ |
| | update | ✅ | ✅ | ❌ | ❌ | ❌ |
| | delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| | approve | ✅ | ✅ | ❌ | ❌ | ✅ |
| **reports** | view | ✅ | ✅ | ❌ | ✅ | ✅ |
| | export | ✅ | ✅ | ❌ | ✅ | ✅ |
| | full | ✅ | ✅ | ❌ | ❌ | ✅ |

### 5.2 Sidebar Visibility

| Menu | super_admin | hr_admin | branch_manager | accountant | director |
|------|:-----------:|:--------:|:--------------:|:----------:|:--------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nhân viên | ✅ | ✅ | ❌ | ❌ | ❌ |
| Hợp đồng | ✅ | ✅ | ❌ | ❌ | ❌ |
| Chấm công | ✅ | ✅ | ✅ | ❌ | ❌ |
| Tính lương | ✅ | ✅ | ❌ | ✅ | ❌ |
| Tài khoản | ✅ | ❌ | ❌ | ❌ | ❌ |
| Báo cáo | ✅ | ✅ | ❌ | ✅ | ✅ |

### 5.3 Sensitive Data Protection

| Dữ liệu | Cơ chế | Roles được xem |
|----------|--------|----------------|
| Mức lương | `SalaryDisplay` hiện `***` | super_admin, hr_admin, accountant, director |
| CCCD | `MaskedNationalId` ẩn 8 số đầu | Tất cả (luôn ẩn) |
| Data chi nhánh | Branch filter trong store | branch_manager chỉ thấy chi nhánh mình |

### 5.4 3 Layers bảo vệ

```
Layer 1: Middleware        → Chặn route nếu chưa login (cookie check)
Layer 2: ProtectedRoute    → Chặn page nếu không có quyền view (redirect + toast)
Layer 3: guardPermission() → Chặn store action nếu không có quyền (set error)
         + UI hide buttons  → Ẩn nút nếu không có quyền (UX)
```

---

## 6. API Endpoints

### Mock API: json-server — `http://localhost:3001`

| Method | Endpoint | Store | Tác dụng |
|--------|----------|-------|----------|
| GET | `/employees` | employeeStore | Lấy danh sách NV |
| POST | `/employees` | employeeStore | Thêm NV mới |
| PATCH | `/employees/:id` | employeeStore | Cập nhật NV |
| DELETE | `/employees/:id` | employeeStore | Xóa NV |
| GET | `/contracts` | contractStore | Lấy danh sách hợp đồng |
| POST | `/contracts` | contractStore | Tạo hợp đồng mới |
| PATCH | `/contracts/:id` | contractStore | Cập nhật hợp đồng |
| DELETE | `/contracts/:id` | contractStore | Xóa hợp đồng |
| GET | `/attendance` | attendanceStore | Lấy chấm công |
| POST | `/attendance` | attendanceStore | Thêm chấm công |
| PATCH | `/attendance/:id` | attendanceStore | Cập nhật chấm công |
| DELETE | `/attendance/:id` | attendanceStore | Xóa chấm công |
| GET | `/leaves` | attendanceStore | Lấy đơn nghỉ phép |
| PATCH | `/leaves/:id` | attendanceStore | Duyệt/từ chối nghỉ phép |
| GET | `/payroll` | payrollStore | Lấy bảng lương |
| POST | `/payroll` | payrollStore | Tạo record lương |
| PATCH | `/payroll/:id` | payrollStore | Cập nhật status/data |
| DELETE | `/payroll/:id` | payrollStore | Xóa record lương |
| GET | `/accounts` | accountStore | Lấy danh sách tài khoản |
| POST | `/accounts` | accountStore | Tạo tài khoản |
| PATCH | `/accounts/:id` | accountStore | Cập nhật tài khoản |
| DELETE | `/accounts/:id` | accountStore | Xóa tài khoản |

---

## 7. Hướng dẫn phát triển

### 7.1 Chạy dự án

```bash
# 1. Cài dependencies
npm install

# 2. Chạy mock API (terminal 1)
npm run mock-api
# → json-server chạy tại localhost:3001

# 3. Chạy dev server (terminal 2)
npm run dev
# → Next.js chạy tại localhost:3000

# 4. Mở trình duyệt
# → http://localhost:3000
# → Tự redirect sang /login
# → Dùng tài khoản test: admin / admin123
```

### 7.2 Cách thêm module mới

Ví dụ: thêm module **"Đào tạo" (training)**

```
Bước 1: Tạo type
  → src/types/training.ts
  → Zod schema + TypeScript types

Bước 2: Tạo store
  → src/store/trainingStore.ts
  → Pattern: STATE → ACTIONS → COMPUTED
  → Thêm guardPermission() cho write actions

Bước 3: Tạo components
  → src/components/training/TrainingPageClient.tsx
  → src/components/training/TrainingTable.tsx
  → src/components/training/TrainingForm.tsx

Bước 4: Tạo page
  → src/app/(main)/training/page.tsx
  → Wrap trong ProtectedRoute module="training" action="view"

Bước 5: Thêm vào constants
  → lib/constants.ts: NAV_ITEMS → thêm { href: "/training", ... }
  
Bước 6: Thêm quyền
  → types/account.ts: ROLE_PERMISSIONS → thêm training cho mỗi role

Bước 7: Thêm mock data
  → db.json: thêm "training": [...]
```

### 7.3 Cách thêm role mới

Ví dụ: thêm role **"area_manager"** (quản lý vùng)

```
Bước 1: types/account.ts
  → userRoleSchema: thêm "area_manager" vào z.enum
  → ROLE_PERMISSIONS: thêm area_manager: [...]
  → ROLE_CONFIG: thêm label_vi, badgeColor, description

Bước 2: types/common.ts
  → UserRole: thêm "area_manager"

Bước 3: lib/constants.ts
  → ROLE_LABELS: thêm area_manager
  → NAV_ITEMS: cập nhật visibleFor arrays

Bước 4: lib/mockAuth.ts
  → MOCK_USERS: thêm mock user cho role mới

Bước 5: components/auth/LoginForm.tsx
  → MOCK_CREDENTIALS: thêm credentials

Bước 6: components/shared/LanguageSwitcher.tsx
  → ROLES array: thêm role mới

Bước 7: components/accounts/AccountForm.tsx
  → z.enum: thêm role mới

Bước 8: components/accounts/RolePermissionMatrix.tsx
  → ROLES array: thêm role mới
```

### 7.4 Cách kết nối backend thật

```
Bước 1: Thay mock auth
  → Xóa mockAuth.ts, MOCK_CREDENTIALS
  → LoginForm: gọi POST /api/auth/login → nhận JWT
  → Lưu JWT vào cookie httpOnly (không localStorage)
  → middleware.ts: verify JWT thay vì check cookie string

Bước 2: Thay API base URL
  → Mỗi store có const API_BASE = "http://localhost:3001"
  → Đổi thành biến môi trường: process.env.NEXT_PUBLIC_API_URL
  → Hoặc dùng Next.js API routes (src/app/api/...)

Bước 3: Thêm auth headers
  → Mỗi fetch() cần gửi header: Authorization: Bearer <JWT>
  → Tạo helper: lib/api.ts → authFetch(url, options)

Bước 4: Xóa optimistic updates (tuỳ chọn)
  → Nếu backend chậm: giữ optimistic + rollback
  → Nếu backend nhanh: chờ response rồi mới update state

Bước 5: Xóa guardPermission ở frontend (tuỳ chọn)
  → Backend sẽ trả 403 nếu không có quyền
  → Frontend có thể giữ guard để UX tốt hơn (không gọi API thừa)

Bước 6: Xoá RoleSwitcher / LanguageSwitcher (production)
  → Chỉ dùng cho dev/test, không cần ở production
```

### 7.5 Các lỗi thường gặp + cách fix

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| **Hydration mismatch** (Sidebar) | SSR không có localStorage → role khác client | Sidebar trả `[]` khi SSR, chỉ render sau `mounted` |
| **TS2307: Cannot find module** | `.next/types/validator.ts` cache cũ | Xóa `.next/` rồi restart dev |
| **CORS error** | json-server không cho phép origin khác | Chạy json-server với `--host 0.0.0.0` |
| **"Bạn không có quyền..."** | guardPermission() chặn action | Đổi role sang role có quyền tương ứng |
| **Redirect loop /login** | Cookie `mock_current_role` bị xóa/hết hạn | Clear cookie + login lại |
| **Port 3000 in use** | Process cũ chưa tắt | Kill process: `npx kill-port 3000` |
| **Compaction failed** | Turbopack cache bị corrupted | Xóa `.next/` + restart |
| **middleware deprecated** | Next.js 16 đổi sang "proxy" convention | Warning chỉ — middleware vẫn hoạt động |
| **Form validation lỗi** | Zod v4 API khác v3 | Check `z.string()` thay vì `z.string({ required_error })` |
| **Empty table** | json-server chưa chạy hoặc db.json rỗng | Chạy `npm run mock-api` và kiểm tra `db.json` |

### 7.6 Scripts NPM

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Chạy Next.js dev server (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Chạy production build |
| `npm run lint` | ESLint check |
| `npm run mock-api` | Chạy json-server mock API |

---

> **Ghi chú**: Tài liệu này được tạo tự động. Cập nhật khi có thay đổi lớn về kiến trúc, thêm module, hoặc thay đổi phân quyền.
