# AssetFlow — Frontend Project Documentation
### Enterprise Asset & Resource Management System (Frontend-Only Build)

**Version:** 1.0
**Scope:** This document covers everything needed to build the AssetFlow frontend independently — user roles, page-by-page design specs, authentication flow, and the data schema the UI is built against (as mock data / a future API contract). No backend implementation is included; all data operations are assumed to run against mock JSON or local state until a real API is connected.

---

## Table of Contents

1. Project Overview
2. User Roles & Requirements
3. Authentication & Session Design
4. Information Architecture (Sitemap)
5. Page-by-Page Design Specification
6. Data Schema (Frontend Contract)
7. Frontend Architecture
8. Design System
9. Component Inventory
10. State Management Plan
11. Mock API Layer
12. Responsive & Accessibility Rules
13. Role ↔ Page Connection Map (Design Inputs & Data Flow)
14. Recommended Tech Stack (Detailed)
15. Routing Table with Guards
16. Page-Level Component Breakdown
17. Form Field & Validation Reference
18. Suggested Build Order (Easiest Path to a Working Demo)

---

## 1. Project Overview

AssetFlow is an industry-neutral ERP module for tracking physical assets and shared resources — who holds what, where it is, its condition, and its full lifecycle. The frontend must demonstrate **connected workflows**, not isolated CRUD screens: an allocation conflict, a booking overlap, a maintenance approval, and an audit discrepancy should all visibly ripple into the dashboard, notifications, and activity log.

**Core entities the UI revolves around:** Departments, Categories, Employees, Assets, Allocations, Transfers, Bookings, Maintenance Requests, Audit Cycles, Notifications, Activity Logs.

**Four roles:** Admin, Asset Manager, Department Head, Employee — each sees a different navigation set, different dashboard, and different action permissions on the same underlying pages.

---

## 2. User Roles & Requirements

### 2.1 Admin
**Mental model:** "I set up the organization and audit it — I don't run day-to-day operations."

| Can do | Cannot do |
|---|---|
| Create/edit/deactivate Departments & Categories | Approve allocations/transfers (view only) |
| Promote Employee → Department Head / Asset Manager | Register assets directly (view only) |
| Create, assign auditors to, and close Audit Cycles | Self-elevate role (impossible — no UI for it) |
| View organization-wide Dashboard, Reports, Activity Logs | |

**Primary screens:** Dashboard, Organization Setup (3 tabs), Audit Cycles, Reports, Activity Logs, Notifications.

### 2.2 Asset Manager
**Mental model:** "I run asset operations — registration, allocation, maintenance, discrepancy resolution."

| Can do | Cannot do |
|---|---|
| Register/edit assets | Manage departments/categories (view only) |
| Allocate assets, approve transfers & returns | Promote users or manage roles |
| Approve/reject maintenance, assign technicians | Close audit cycles (Admin only) |
| Resolve audit discrepancies, mark Lost/Retired/Disposed | |

**Primary screens:** Dashboard, Asset Directory, Allocation & Transfer, Maintenance Management, Audit Cycles (contributor view), Reports.

### 2.3 Department Head
**Mental model:** "I manage my department's slice of the organization."

| Can do | Cannot do |
|---|---|
| View assets/employees in their department (+ children) | See other departments' data |
| Approve allocation/transfer requests within their department | Approve org-wide requests |
| Book shared resources on behalf of the department | Modify categories or close audits |
| View department-scoped reports | Register new assets |

**Primary screens:** Dashboard (department-scoped), Asset Directory (scoped), Allocation & Transfer (department queue), Resource Booking, Reports (scoped).

### 2.4 Employee
**Mental model:** "I use what's assigned to me and request what I need."

| Can do | Cannot do |
|---|---|
| View assets allocated to them + their own history | View others' allocations |
| Initiate transfer & return requests | Approve any request |
| Book shared resources | Register assets |
| Raise maintenance requests | Access reports/admin screens |
| Act as technician or auditor **only when explicitly assigned** | Self-assign to tasks |

**Primary screens:** Dashboard (personal), My Assets, Book Resource, My Bookings, Raise Maintenance, My Requests, Notifications.

### 2.5 Role → Navigation Matrix

| Nav item | Admin | Asset Manager | Dept Head | Employee |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ (org) | ✅ (ops) | ✅ (dept) | ✅ (personal) |
| Organization Setup | ✅ | 👁 view | 👁 dept view | ❌ |
| Asset Directory | 👁 | ✅ | 👁 scoped | 👁 own only |
| Allocation & Transfer | 👁 | ✅ | ✅ dept | request-only |
| Resource Booking | 👁 | ✅ | ✅ | ✅ |
| Maintenance | 👁 | ✅ | 👁 dept | raise-only |
| Audit Cycles | ✅ create/close | contributor | 👁 dept | assigned-only |
| Reports | ✅ org-wide | ✅ ops-wide | 👁 dept | ❌ |
| Notifications & Logs | ✅ | ✅ | ✅ | ✅ own |

---

## 3. Authentication & Session Design

### 3.1 Core rule
**Signup always creates an `EMPLOYEE`.** There is no role selector anywhere in the signup flow. Role promotion only happens through Admin → Organization Setup → Employee Directory.

### 3.2 Screens

**Login**
- Fields: email, password
- Actions: "Log in", "Forgot password?" link, "Create account" link
- States: idle → loading → success (redirect to role-aware Dashboard) / error (inline banner: "Invalid email or password")
- Validation: email format, password non-empty, real-time field errors on blur

**Signup**
- Fields: full name, email, password, confirm password
- No role field, no department field (assigned later by Admin)
- On submit → account created as Employee, Status = Active, auto-login → redirect to a minimal "Welcome" state (empty Dashboard, no department yet)
- Validation: password strength meter (min 8 chars), email uniqueness check (async, debounced), password match check

**Forgot Password**
- Step 1: enter email → "reset link sent" confirmation state (always show success message regardless of whether email exists, to avoid account enumeration)
- Step 2 (from emailed link, token in URL): new password + confirm → success → redirect to Login

**Session behavior**
- JWT (or mock token) stored in memory + httpOnly-style handling assumption; frontend treats token as opaque
- Silent session validation on app load (`GET /api/auth/me` equivalent) → if invalid/expired, redirect to Login with a toast: "Your session expired, please log in again."
- Idle/expired session mid-action: any write action that fails with 401 shows a non-destructive modal ("Session expired — log in to continue") rather than losing unsaved form data silently where avoidable.

### 3.3 Route protection

| Route type | Behavior |
|---|---|
| Public | `/login`, `/signup`, `/forgot-password` — redirect to Dashboard if already authenticated |
| Protected (any role) | Everything else — redirect to `/login` if unauthenticated |
| Role-gated | Org Setup, Audit creation/closure, Reports — render a "You don't have access to this page" state rather than a blank screen if a wrong-role user lands on the URL directly |

### 3.4 Auth screen wireframe notes
- Centered card, max-width ~400px, logo top, form below, footer links
- Password field has show/hide toggle
- Primary CTA full-width, secondary links as plain text below the card
- Loading state disables the button and shows an inline spinner inside it (not a full-page spinner)

---

## 4. Information Architecture (Sitemap)

```
/login
/signup
/forgot-password
/reset-password?token=...

/dashboard                         (role-aware home)
/organization                      (Admin only — 3 tabs)
  /organization/departments
  /organization/categories
  /organization/employees
/assets                            (directory, filters, search)
/assets/:id                        (detail: overview, history, actions)
/assets/register                   (Asset Manager)
/allocations                       (queue view)
/allocations/:id                   (detail + approve/reject/transfer)
/bookings                          (calendar view)
/bookings/:id
/maintenance                       (list/kanban)
/maintenance/:id
/audits                            (cycle list)
/audits/:id                        (items, discrepancy report)
/reports                           (tabs per report type)
/notifications
/activity-logs
/profile
```

---

## 5. Page-by-Page Design Specification

Each page below follows the same explanation pattern used across the app: **Purpose → Who sees it → Layout → Key components → States → Empty state → Role variations.**

---

### 5.1 Login / Signup
**Purpose:** Authenticate or create an account with no self-elevation.
**Layout:** Single centered card on a subtly branded background (soft gradient or asset-themed illustration, not corporate-stock).
**Components:** `AuthCard`, `TextInput`, `PasswordInput`, `PrimaryButton`, `InlineError`.
**States:** idle, submitting, success (redirect), error (shake + red border on offending field).
**Empty state:** N/A.

---

### 5.2 Dashboard / Home
**Purpose:** Real-time operational snapshot, entry point after login.
**Layout:** Top KPI card row (6 cards, horizontally scrollable on mobile) → Overdue section (visually distinct, warm/red accent) → Quick actions row → Recent activity feed (right rail on desktop, below on mobile).

**KPI cards (exact set):**
1. Assets Available
2. Assets Allocated
3. Maintenance Today
4. Active Bookings
5. Pending Transfers
6. Upcoming Returns

**Quick actions:** Register Asset, Book Resource, Raise Maintenance Request — each a prominent button/tile, filtered by role (Employee sees only "Book Resource" and "Raise Maintenance Request").

**Role variations:**
- Admin: org-wide totals, no "Register Asset" quick action
- Asset Manager: ops-wide totals, all quick actions
- Department Head: department-filtered totals
- Employee: personal totals only ("My Assets: 2", "My Bookings: 1") — a materially different, simplified card set

**States:** loading (skeleton cards), loaded, error (retry banner).
**Empty state:** New org with no data → friendly onboarding checklist instead of zeroed KPI cards ("Set up your first department to get started").

---

### 5.3 Organization Setup (Admin only, 3 tabs)
**Purpose:** Maintain master data.
**Layout:** Tabbed interface — Departments | Categories | Employee Directory.

**Tab A — Departments**
- Table: Name, Head, Parent Dept, Status, Actions
- "+ New Department" opens a side drawer: Name, Parent Department (searchable select), Department Head (select from active employees), Status toggle
- Deactivate action requires confirmation modal, and blocks if the department has active employees/assets ("Reassign 4 employees before deactivating")

**Tab B — Categories**
- Card grid or table: Name, description, # of assets using it, custom field count
- "+ New Category" drawer: Name, Description, dynamic key-value builder for `metadataSchema` (e.g. add field "Warranty Period", type: number)

**Tab C — Employee Directory**
- Table: Name, Email, Department, Role (badge), Status (toggle), Actions
- "Promote" action → dropdown: Department Head / Asset Manager, with a confirmation modal explicitly stating this is an auditable action
- This tab is the **only** role-assignment surface in the entire app — no role field appears anywhere else

**Empty state:** "No departments yet — create your first one to start organizing assets."

---

### 5.4 Asset Directory
**Purpose:** Central asset registry with search/filter.
**Layout:** Filter bar (top) → Table/Card toggle → Pagination.
**Filters:** Asset Tag, Serial Number, QR code, Category, Status, Department, Location — combinable, with active filter chips shown below the bar and a "Clear all" action.
**Table columns:** Asset Tag, Name, Category, Status (badge, color-coded per lifecycle state), Location, Current Holder, Actions.
**Row action:** click → `/assets/:id`.
**Role variations:** Employee's view of this page is replaced by "My Assets" — same visual pattern, but pre-filtered to their own allocations with no search/filter bar needed.

**Empty state:** "No assets match these filters" with a "Clear filters" CTA; distinct from "No assets registered yet" (Asset Manager sees a "Register your first asset" CTA in that case).

---

### 5.5 Asset Detail
**Purpose:** Full view of one asset — the hub page tying all modules together.
**Layout:** Header (asset name, tag, status badge, photo thumbnail) → Tabs: Overview | Allocation History | Maintenance History | Documents.

**Overview tab:** Two-column info grid (Category, Serial Number, Location, Condition, Acquisition Date/Cost, Bookable flag) + a right-side "Current Holder" card + lifecycle state diagram showing current position (visual, not just text) + valid next actions as buttons (only actions valid for the current state AND the logged-in role appear — e.g. Employee sees "Request Transfer" or "Raise Maintenance" only, never "Allocate").

**Allocation History tab:** Timeline list — holder, allocated by, dates, return condition, most recent first.
**Maintenance History tab:** Timeline list — issue, priority, resolution, cost, dates.
**Documents tab:** Grid of uploaded photos/files with upload action (Asset Manager only).

**Empty state:** "This asset has no allocation history yet."

---

### 5.6 Asset Registration (Asset Manager)
**Purpose:** Register a new asset.
**Layout:** Single-column form, grouped into sections: Basic Info, Classification, Acquisition, Photo/Documents.
**Fields:** Name, Category (select), Serial Number (unique, validated live), Condition (select), Location (text/select), Acquisition Date, Acquisition Cost, `isBookable` toggle, photo dropzone.
**Behavior:** Asset Tag is auto-generated and shown as a read-only preview ("Will be assigned: AF-0142") before submit.
**States:** validating serial number uniqueness inline (spinner next to field), submit → success toast + redirect to new asset's detail page.

---

### 5.7 Allocation & Transfer
**Purpose:** Manage who holds what, with explicit conflict handling.
**Layout:** Two-pane — left: queue/list (Pending Transfers, My Department's Requests depending on role); right (or modal): detail panel.

**Allocate flow (from Asset Detail or this page):**
1. Select employee or department as holder
2. Optional expected return date
3. On submit: if asset already held → **blocking modal**: "This asset is currently held by Priya S. (Marketing)." with a single clear CTA: "Request Transfer Instead" — no way to force-allocate
4. If available → confirmation → success toast, asset status updates live in UI

**Transfer request card:** shows From → To, requested by, reason, status badge (Requested/Approved/Rejected), and Approve/Reject buttons for authorized roles only.

**Return flow:** modal with condition select (Good/Fair/Damaged) + notes textarea → submit → pending Asset Manager approval → status badge "Pending Return Approval" until confirmed.

**Empty state:** "No pending transfer requests."

---

### 5.8 Resource Booking
**Purpose:** Time-slot booking of shared/bookable assets.
**Layout:** Resource selector (dropdown or sidebar list of bookable assets) → Calendar (week view default, day/month toggle) → booking form drawer.

**Calendar:** existing bookings rendered as colored blocks; hovering shows requester + purpose.
**New booking:** click-drag on calendar OR "+ New Booking" button → drawer with Resource, Start/End datetime pickers, Purpose field.
**Conflict handling:** on submit, if overlapping → inline error directly under the time fields: *"This resource is already booked from 09:00 to 10:00."* — do not let the modal close; keep the form open so the user can adjust the time immediately.
**Booking status badges:** Upcoming (blue), Ongoing (green), Completed (grey), Cancelled (strikethrough grey).
**Cancel/Reschedule:** available from a booking's detail popover, with confirmation for cancel.

**Empty state:** "No bookings yet for this resource — select a time on the calendar to create one."

---

### 5.9 Maintenance Management
**Purpose:** Route repairs through approval before work starts.
**Layout:** Kanban-style board by status (Pending → Approved → Technician Assigned → In Progress → Resolved) OR a filterable list — recommend **Kanban for Asset Manager**, **simple list for Employee** ("My Requests").

**Raise request (Employee/any holder):** modal — Asset (pre-filled if opened from Asset Detail), Issue description, Priority (Low/Medium/High/Urgent), photo attach.
**Approve/Reject (Asset Manager):** card expands to show full detail + Approve/Reject buttons + decision note field. Approving asset auto-updates its status badge elsewhere in the app (toast: "Asset status updated to Under Maintenance").
**Assign technician:** select from active employees (searchable dropdown).
**Resolve:** form — work completed notes, cost, resulting condition → asset reverts to Available/Allocated.

**Empty state (per column):** subtle "No requests here" placeholder rather than an empty box.

---

### 5.10 Asset Audits
**Purpose:** Structured verification cycles.
**Layout:** List of Audit Cycles (Draft/Active/Closed badge) → click into a cycle → item checklist view.

**Create cycle (Admin):** modal — Name, Scope (department and/or location), Date range, then "Assign Auditors" step (multi-select employees).
**Cycle detail (auditor view):** checklist of snapshotted assets; each row: asset info + three action buttons (Verified / Missing / Damaged) + notes field, expandable per item.
**Discrepancy report:** auto-generated sub-view, filterable, exportable — lists only Missing/Damaged items with resolution status.
**Close cycle (Admin):** confirmation modal explaining this locks all items permanently.

**Empty state:** "No audit cycles yet. Create one to start a structured verification."

---

### 5.11 Reports & Analytics
**Purpose:** Actionable operational insight.
**Layout:** Tab bar across report types: Utilization | Maintenance Frequency | Due/Retirement Risk | Department Allocation | Booking Heatmap.
**Each tab:** a chart (bar/line/heatmap as appropriate) + a data table below it + "Export CSV" button.
**Role variation:** Department Head sees the same tabs pre-filtered to their department, with no toggle to view others.

**Empty state:** "Not enough data yet to generate this report."

---

### 5.12 Activity Logs & Notifications
**Purpose:** Keep every role informed.

**Notifications (bell icon, global):** dropdown panel — unread count badge, list grouped by Today/Earlier, each item deep-links to the relevant record, "Mark all as read" action.
**Notification types:** Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert, Audit Discrepancy Flagged.

**Activity Logs (full page, Admin/Asset Manager):** filterable table — Actor, Action, Entity, Timestamp, expandable row for before/after diff. Append-only — no edit/delete UI exists for this page, by design.

**Empty state:** "No notifications yet" / "No activity recorded yet."

---

## 6. Data Schema (Frontend Contract)

Since this is a frontend-only build, the schema below is the **shape the UI codes against** — as TypeScript interfaces the frontend uses for mock data, form validation, and (later) real API responses.

```typescript
type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';
type UserStatus = 'ACTIVE' | 'INACTIVE';
type AssetStatus =
  | 'AVAILABLE' | 'ALLOCATED' | 'RESERVED'
  | 'UNDER_MAINTENANCE' | 'LOST' | 'RETIRED' | 'DISPOSED';
type TransferStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';
type BookingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
type MaintenanceStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'TECHNICIAN_ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
type AuditCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
type AuditResult = 'PENDING' | 'VERIFIED' | 'MISSING' | 'DAMAGED';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

interface Category {
  id: string;
  name: string;
  description: string;
  metadataSchema: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
}

interface Asset {
  id: string;
  assetTag: string;        // e.g. AF-0001
  serialNumber: string;
  name: string;
  categoryId: string;
  owningDepartmentId: string | null;
  location: string;
  condition: string;
  status: AssetStatus;
  acquisitionDate: string;
  acquisitionCost: number;
  isBookable: boolean;
  photoUrl: string | null;
  currentHolder: { type: 'employee' | 'department'; id: string; name: string } | null;
}

interface Allocation {
  id: string;
  assetId: string;
  employeeId: string | null;
  departmentId: string | null;
  allocatedById: string;
  allocatedAt: string;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  status: 'ACTIVE' | 'RETURNED';
  returnCondition: string | null;
  checkInNotes: string | null;
}

interface TransferRequest {
  id: string;
  assetId: string;
  sourceAllocationId: string;
  toEmployeeId: string | null;
  toDepartmentId: string | null;
  requestedById: string;
  approverId: string | null;
  status: TransferStatus;
  reason: string;
  decisionNote: string | null;
  createdAt: string;
}

interface Booking {
  id: string;
  assetId: string;
  bookedById: string;
  departmentId: string | null;
  startAt: string;
  endAt: string;
  purpose: string;
  status: BookingStatus;
}

interface MaintenanceRequest {
  id: string;
  assetId: string;
  reporterId: string;
  approvedById: string | null;
  technicianId: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: MaintenanceStatus;
  issueDescription: string;
  attachmentUrl: string | null;
  resolution: string | null;
  cost: number | null;
  reportedAt: string;
  resolvedAt: string | null;
}

interface AuditCycle {
  id: string;
  name: string;
  scopeDepartmentId: string | null;
  scopeLocation: string | null;
  startDate: string;
  endDate: string;
  status: AuditCycleStatus;
  auditorIds: string[];
}

interface AuditItem {
  id: string;
  cycleId: string;
  assetId: string;
  auditorId: string | null;
  result: AuditResult;
  notes: string;
  resolutionStatus: 'OPEN' | 'RESOLVED';
}

interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  readAt: string | null;
  timestamp: string;
}

interface ActivityLogEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
}
```

---

## 7. Frontend Architecture

**Recommended stack:** React + TypeScript + Vite (or Next.js if SSR/routing conventions preferred), Tailwind CSS, React Router (or Next routing), Zustand/Redux Toolkit for state, React Query (TanStack Query) for async/mock-data caching even before a real backend exists.

**Folder structure:**
```
src/
  app/                 routing + layout shell
  features/
    auth/
    dashboard/
    organization/
    assets/
    allocations/
    bookings/
    maintenance/
    audits/
    reports/
    notifications/
  components/          shared UI primitives (buttons, inputs, badges, modals)
  mocks/               mock data + mock API handlers (e.g. MSW)
  types/               shared TypeScript interfaces (Section 6)
  hooks/                 role/permission hooks, data hooks
  utils/
```

**Role-based rendering pattern:** a single `usePermissions()` hook returns capability flags (`canAllocate`, `canApproveTransfer`, `canRegisterAsset`, etc.) derived from the logged-in user's role — components branch on capabilities, not on raw role strings, so permission logic lives in one place.

---

## 8. Design System

**Tone:** Clean, operational, trustworthy — not playful. Think "well-run internal tool," not marketing site.

**Color usage:**
- Primary brand color: used for primary actions and active nav state
- Status badge colors (consistent everywhere): Available = green, Allocated = blue, Reserved = amber, Under Maintenance = orange, Lost = red, Retired/Disposed = grey
- Priority colors (maintenance): Low = grey, Medium = blue, High = orange, Urgent = red

**Typography:** one clean sans-serif (e.g. Inter) — Bold for headings/KPI numbers, Regular for body, Medium for labels/badges.

**Spacing/layout:** 8px base grid, card-based layout throughout, generous whitespace over dense tables where possible, sticky filter bars on long list pages.

**Components requiring special care:**
- Status badges: pill-shaped, color-coded, consistent across every page they appear on
- Lifecycle state diagram (Asset Detail): small horizontal stepper showing the asset's position among valid states, not just a plain badge
- Conflict/blocking modals (allocation, booking): always red/amber accent, always offer the resolving action (Transfer Request / pick another time) directly in the modal, never just an "OK" dismiss

---

## 9. Component Inventory

| Component | Used on |
|---|---|
| `KpiCard` | Dashboard |
| `StatusBadge` | Assets, Bookings, Maintenance, Transfers, Audit Items |
| `LifecycleStepper` | Asset Detail |
| `ConflictModal` | Allocation, Booking |
| `DataTable` (sortable, filterable) | Asset Directory, Employee Directory, Activity Logs |
| `Calendar` | Resource Booking |
| `KanbanBoard` | Maintenance |
| `Drawer` (side panel form) | New Department/Category/Asset/Booking |
| `Timeline` | Allocation History, Maintenance History |
| `NotificationPanel` | Global header |
| `RoleGate` (wrapper) | Any role-restricted UI |
| `EmptyState` | Every list/table page |
| `ConfirmDialog` | Deactivate, Close Audit, Cancel Booking |

---

## 10. State Management Plan

- **Server/async state** (assets, allocations, bookings, etc.): React Query — handles caching, loading/error states, and refetch-on-mutation so the Dashboard/Notifications update automatically after any action, matching the "connected modules" requirement.
- **Auth/session state:** small global store (Zustand) holding `currentUser`, `token`, `isAuthenticated` — read by `usePermissions()` everywhere.
- **UI-only state** (drawer open/closed, active filters, calendar view mode): local component state, not global.
- **Optimistic updates:** used for low-risk actions (marking notification read); **not** used for conflict-sensitive actions (allocate, book) — those always wait for the mock/real API response so conflict errors render correctly.

---

## 11. Mock API Layer

Since there's no backend yet, use **MSW (Mock Service Worker)** or a simple in-memory mock module implementing the same endpoint shapes the eventual API will use, so swapping in a real backend later requires no component changes:

```
POST /api/auth/signup          POST /api/auth/login
GET  /api/assets                POST /api/assets/:id/allocate
POST /api/assets/:id/transfer   POST /api/allocations/:id/return
GET/POST /api/bookings          PATCH /api/bookings/:id
GET/POST /api/maintenance       PATCH /api/maintenance/:id/decision
GET/POST /api/audits            POST /api/audits/:id/close
GET  /api/dashboard             GET  /api/notifications
```

Mock responses should include realistic conflict scenarios seeded by default (an asset held by "Priya S.", a room booked 09:00–10:00) so the demo scenarios from the original brief work immediately against mock data.

**Response envelope (match this even in mocks):**
```json
{ "success": true, "data": { ... }, "message": "" }
{ "success": false, "code": "BOOKING_OVERLAP", "message": "This resource is already booked from 09:00 to 10:00." }
```

---

## 12. Responsive & Accessibility Rules

- Breakpoints: mobile (<640px), tablet (640–1024px), desktop (>1024px)
- Sidebar nav collapses to a bottom tab bar or hamburger drawer on mobile
- KPI card row becomes horizontally scrollable, not stacked, on mobile (keeps at-a-glance scanning)
- Calendar view defaults to a day/agenda list on mobile instead of a full week grid
- All interactive elements meet 44px min touch target
- Color is never the only signal for status — badges always pair color with text/label
- Every loading state has a skeleton, not a spinner-only screen, for pages with structured content (tables, dashboards)
- Every destructive/approval action requires a confirmation step

---

## 13. Role ↔ Page Connection Map (Design Inputs & Data Flow)

This section shows, for every page: **which roles land there, what data must already exist for it to render correctly (design inputs), and which other pages it pushes updates to (connections).** This is the map that makes the app feel "connected" instead of a stack of disconnected CRUD screens.

### 13.1 Connection principle

Every write action in AssetFlow follows the same ripple:

```
Action on Page A
   → updates the underlying entity (Asset / Allocation / Booking / etc.)
   → writes an ActivityLog entry
   → creates a Notification for the relevant user(s)
   → invalidates the Dashboard's KPI query
   → invalidates any list/detail page currently showing that entity
```

In React Query terms: every mutation calls `queryClient.invalidateQueries()` on **4 fixed query keys**: `['dashboard']`, `['notifications']`, `['activity-logs']`, and the specific entity's own key (e.g. `['assets', assetId]`). Build this invalidation call into a single shared `useEntityMutation()` wrapper hook so no individual page has to remember to do it manually.

### 13.2 Per-page connection table

| Page | Roles who land here | Design inputs required (data that must exist) | Connects to (what it updates elsewhere) |
|---|---|---|---|
| Dashboard | All (scoped per role) | Users, Departments, Assets, Allocations, Bookings, Maintenance, Transfers — aggregated counts | Reads-only hub; deep-links out to every other page |
| Organization Setup | Admin (edit), others (view) | none (bootstraps the org) | Feeds Department/Category selects on Asset Registration, Employee Directory feeds every "assign to" dropdown app-wide |
| Asset Directory | All (scoped) | Categories, Departments (for filters) | Row click → Asset Detail |
| Asset Detail | All (scoped) | Asset, its Allocations, MaintenanceRequests, AuditItems | Actions here open Allocation, Transfer, Maintenance, Booking flows — writes back to Dashboard + Notifications |
| Asset Registration | Asset Manager | Categories, Departments must already exist | New Asset appears immediately in Asset Directory + Dashboard "Assets Available" KPI |
| Allocation & Transfer | Asset Manager (all), Dept Head (own dept), Employee (request only) | Asset must exist & be Available/Allocated; Employee Directory for holder select | Updates Asset.status + Asset Detail's holder card + Dashboard "Pending Transfers"/"Assets Allocated" KPIs + Notification to old & new holder |
| Resource Booking | All | Assets where `isBookable = true` | Updates Dashboard "Active Bookings" KPI + Notification/reminder to requester |
| Maintenance | Asset Manager (approve/assign), Employee (raise), Dept Head (view) | Asset must exist; active Employees for technician assign | Updates Asset.status ↔ Under Maintenance, feeds Asset Detail's Maintenance History tab, Dashboard "Maintenance Today" KPI |
| Audit Cycles | Admin (create/close), Asset Manager (resolve discrepancies), assigned Employees (verify items) | Departments/Locations for scope; Assets in scope snapshotted at activation; Employee Directory for auditor assignment | Confirmed-missing items flip Asset.status → Lost; feeds Discrepancy Report + Notifications to Asset Manager |
| Reports | Admin, Asset Manager, Dept Head (scoped) | Requires historical Allocation/Booking/Maintenance data to be non-trivial | Read-only; no downstream writes |
| Notifications | All (own) | Generated by every write action above | Deep-links back into the originating entity's detail page |
| Activity Logs | Admin, Asset Manager | Generated by every write action above | Read-only, append-only |

### 13.3 Role interaction flows (who triggers what for whom)

These are the cross-role sequences the UI needs to support smoothly — each is a good basis for an end-to-end demo click-through:

1. **Allocation conflict → transfer:** Employee A holds Asset X → Asset Manager tries to allocate X to Employee B → blocked, shown "held by A" → clicks "Request Transfer" → Department Head or Asset Manager approves → A's allocation closes, B's allocation opens, both get a Notification, Asset Detail history shows both entries.
2. **Booking overlap:** Employee books Room 09:00–10:00 → a second Employee tries 09:30–10:30 → inline rejection with the exact conflicting window shown → adjusts to 10:00–11:00 → succeeds → both see it on the shared Calendar.
3. **Maintenance lifecycle:** Employee raises a fault on an asset they hold → Notification to Asset Manager → Asset Manager approves → Asset status flips to Under Maintenance everywhere it's displayed → technician (any active Employee) assigned → resolves → Asset reverts to prior valid state → Notification back to original reporter.
4. **Audit discrepancy:** Admin creates cycle scoped to a department → assigns Employee as auditor → auditor sees only their assigned items on their Notifications/Dashboard → marks one Missing → Asset Manager gets a Notification → resolves it → Admin closes cycle → Asset status becomes Lost, locked permanently in Activity Log.

### 13.4 Design input checklist before building any page

Before wiring a page's UI to data, confirm these three things are already available in mock data — most page-level bugs come from skipping this:
- **Reference data** the page's dropdowns/filters need (Departments, Categories, Employee Directory)
- **The entity's current state** and whether the logged-in role/permission allows the actions being rendered
- **What this page must invalidate on success** (use the fixed 4-key rule from 13.1)

---

## 14. Recommended Tech Stack (Detailed)

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18 + TypeScript + Vite** | Fastest local dev loop, no SSR complexity needed for an internal tool; TypeScript catches entity-shape mistakes against Section 6's interfaces immediately |
| Routing | **React Router v6** | Simple nested routes + loader-free guards fit a role-gated app well |
| Styling | **Tailwind CSS** + a small set of hand-built primitives | Fast to build consistent spacing/color without a heavy component library fight |
| Component primitives | **shadcn/ui** (Radix-based) for Dialog, Dropdown, Tabs, Toast, Drawer | Accessible out of the box, unstyled enough to match the design system in Section 8 without fighting overrides |
| Server/async state | **TanStack Query (React Query)** | Handles loading/error/cache/invalidation — directly implements the ripple pattern in Section 13.1 |
| Global/auth state | **Zustand** | Minimal boilerplate for `currentUser`, `token`, and the `usePermissions()` hook |
| Forms | **React Hook Form + Zod** | Zod schemas double as both form validation and TypeScript types — reuse the interfaces from Section 6 directly |
| Calendar (Booking page) | **react-big-calendar** or **FullCalendar** | Both support week/day views and overlap-aware event rendering out of the box |
| Charts (Reports page) | **Recharts** | Simplest API for bar/line charts; sufficient for utilization/heatmap-style reports |
| Mock API | **MSW (Mock Service Worker)** | Intercepts fetch calls at the network level — swapping in a real backend later requires zero component code changes |
| Icons | **lucide-react** | Consistent, lightweight icon set matching the shadcn ecosystem |
| Dates | **date-fns** | Lightweight, tree-shakeable, sufficient for booking/overdue calculations |

**Why not Redux:** the app's state is mostly server state (React Query already caches/syncs it) plus a thin auth layer — Redux would add boilerplate without solving a problem Zustand + React Query don't already cover.

**Why not a full component library (MUI/Ant):** Section 8's design system wants a specific, non-generic look; shadcn's unstyled primitives are faster to make distinctive than overriding a heavier library's defaults.

---

## 15. Routing Table with Guards

| Route | Component | Guard |
|---|---|---|
| `/login`, `/signup`, `/forgot-password` | `AuthLayout` pages | `redirectIfAuthenticated` |
| `/dashboard` | `DashboardPage` | `requireAuth` |
| `/organization/*` | `OrganizationPage` (tabs) | `requireAuth + requireRole(['ADMIN'])`, edit actions further gated inline |
| `/assets` | `AssetDirectoryPage` | `requireAuth` (content scoped by role inside the page) |
| `/assets/register` | `AssetRegisterPage` | `requireAuth + requireRole(['ASSET_MANAGER'])` |
| `/assets/:id` | `AssetDetailPage` | `requireAuth` (actions gated by `usePermissions()`) |
| `/allocations` | `AllocationQueuePage` | `requireAuth` |
| `/bookings` | `BookingCalendarPage` | `requireAuth` |
| `/maintenance` | `MaintenancePage` | `requireAuth` |
| `/audits`, `/audits/:id` | `AuditListPage`, `AuditDetailPage` | `requireAuth`, create/close gated to `ADMIN` inline |
| `/reports` | `ReportsPage` | `requireAuth + requireRole(['ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD'])` |
| `/notifications`, `/activity-logs` | resp. pages | `requireAuth`; activity-logs additionally `requireRole(['ADMIN','ASSET_MANAGER'])` |

Implement `requireAuth` and `requireRole` as two small wrapper components around `<Outlet />`, not per-page copy-pasted checks — this is the single highest-leverage refactor to avoid a client-side-only security gap (the backend must re-check everything, but the frontend guard prevents confusing broken states).

---

## 16. Page-Level Component Breakdown

Concrete component trees so each page can be built as a checklist rather than a blank canvas.

**DashboardPage**
`KpiCardRow` → 6× `KpiCard` · `OverdueSection` → `OverdueList` · `QuickActionsRow` → `QuickActionTile` · `RecentActivityFeed` → `ActivityItem`

**OrganizationPage**
`TabBar` (Departments/Categories/Employees) →
- `DepartmentTable` → `DepartmentRow`, `DepartmentFormDrawer`
- `CategoryGrid` → `CategoryCard`, `CategoryFormDrawer` → `MetadataFieldBuilder`
- `EmployeeTable` → `EmployeeRow`, `PromoteRoleModal`

**AssetDirectoryPage**
`FilterBar` → `FilterChip[]` · `ViewToggle` · `AssetTable` (or `AssetCardGrid`) → `AssetRow`/`AssetCard` · `Pagination` · `EmptyState`

**AssetDetailPage**
`AssetHeader` (photo, tag, `StatusBadge`) → `LifecycleStepper` · `TabBar` (Overview/Allocation/Maintenance/Documents) →
- `OverviewTab` → `InfoGrid`, `CurrentHolderCard`, `NextActionButtons`
- `AllocationHistoryTab` → `Timeline` → `TimelineItem`
- `MaintenanceHistoryTab` → `Timeline`
- `DocumentsTab` → `FileGrid`, `UploadDropzone`

**AllocationQueuePage**
`QueueList` → `TransferRequestCard` → `ApproveRejectButtons` · `AllocateModal` → `HolderSelect`, `ConflictModal` · `ReturnModal` → `ConditionSelect`

**BookingCalendarPage**
`ResourceSelector` · `Calendar` → `BookingBlock` · `BookingFormDrawer` → `DateTimeRangePicker`, `OverlapError` · `BookingDetailPopover` → `CancelRescheduleButtons`

**MaintenancePage**
`KanbanBoard` → `KanbanColumn` → `MaintenanceCard` · `RaiseRequestModal` · `RequestDetailDrawer` → `ApproveRejectButtons`, `TechnicianSelect`, `ResolveForm`

**AuditListPage / AuditDetailPage**
`AuditCycleList` → `AuditCycleCard` · `CreateCycleModal` → `ScopeSelector`, `AuditorMultiSelect` · `AuditItemChecklist` → `AuditItemRow` → `ResultButtons` · `DiscrepancyReport` → `DiscrepancyTable`

**ReportsPage**
`ReportTabBar` → per tab: `ChartPanel` (Recharts) + `DataTable` + `ExportCsvButton`

**NotificationPanel (global header)**
`BellIcon` (badge count) → `NotificationDropdown` → `NotificationItem` → deep-link

**ActivityLogsPage**
`LogFilterBar` · `LogTable` → `LogRow` → `DiffExpander`

Shared primitives referenced everywhere: `StatusBadge`, `EmptyState`, `ConfirmDialog`, `Drawer`, `Modal`, `Toast`, `Skeleton`.

---

## 17. Form Field & Validation Reference

| Form | Fields | Zod-style rules |
|---|---|---|
| Login | email, password | email: valid format; password: min 1 char (server checks correctness) |
| Signup | name, email, password, confirmPassword | name: min 2 chars; email: valid + async-unique; password: min 8 chars, 1 number; confirmPassword: must match |
| Department | name, parentDepartmentId?, headUserId?, status | name: min 2 chars, unique |
| Category | name, description?, metadataSchema[] | name: unique; metadataSchema keys: unique per category |
| Asset Registration | name, categoryId, serialNumber, condition, location, acquisitionDate, acquisitionCost, isBookable, photo? | serialNumber: min 3 chars, async-unique; acquisitionCost: positive number; acquisitionDate: not in the future |
| Allocate | holderType (employee/department), holderId, expectedReturnAt? | holderId: required based on holderType; expectedReturnAt: must be future date if set |
| Transfer Request | toHolderId, reason | reason: min 10 chars (forces a real justification) |
| Return | returnCondition, checkInNotes? | returnCondition: required select |
| Booking | assetId, startAt, endAt, purpose | endAt: must be after startAt; both: not in the past; purpose: min 3 chars |
| Maintenance Request | assetId, issueDescription, priority, attachment? | issueDescription: min 10 chars; priority: required select |
| Maintenance Resolve | resolution, cost?, resultingCondition | resolution: min 10 chars; cost: non-negative if provided |
| Audit Cycle | name, scopeDepartmentId?/scopeLocation?, startDate, endDate, auditorIds[] | endDate after startDate; auditorIds: min 1 selected |
| Audit Item verify | result, notes? | result: required (Verified/Missing/Damaged) |

Build one `zodResolver`-backed schema per form co-located with its component (`AssetRegisterForm.schema.ts` next to `AssetRegisterForm.tsx`) rather than one giant shared validation file — keeps each page independently buildable/testable.

---

## 18. Suggested Build Order (Easiest Path to a Working Demo)

Building in this order means every step is immediately visible and testable, and later steps reuse components/patterns established earlier — nothing is built twice.

**Step 1 — Shell & Auth**
Design system tokens (Tailwind config) → `AuthLayout` + Login/Signup/Forgot Password → Zustand auth store → route guards → protected app shell (sidebar + top bar + `<Outlet />`).

**Step 2 — Mock data & API layer**
Write all Section 6 interfaces → seed mock data (a few departments, categories, employees, ~15 assets covering every lifecycle state, one pre-existing allocation, one pre-existing booking) → set up MSW handlers matching Section 11's endpoint list.

**Step 3 — Shared primitives**
`StatusBadge`, `EmptyState`, `Modal`, `Drawer`, `Toast`, `Skeleton`, `ConfirmDialog`, `DataTable` — build these once, well, before any feature page, since every later page depends on them.

**Step 4 — Read-only pages first**
Dashboard (KPIs from mock data) → Asset Directory → Asset Detail (Overview tab only) → Notifications panel → Activity Logs. This gets the whole app "browsable" before any write logic exists.

**Step 5 — Organization Setup**
Departments → Categories → Employee Directory + Promote flow. This unlocks realistic dropdown data for every form that follows.

**Step 6 — Asset lifecycle writes**
Asset Registration → Allocation (including the conflict modal) → Transfer request/approval → Return flow → wire Asset Detail's remaining tabs (Allocation History).

**Step 7 — Booking**
Calendar view (read-only bookings first) → new booking form → overlap validation → cancel/reschedule.

**Step 8 — Maintenance**
Raise request → Kanban board → approve/reject → technician assign → resolve → wire into Asset Detail's Maintenance History tab.

**Step 9 — Audits**
Cycle list/create → item checklist → verify actions → discrepancy report → close cycle.

**Step 10 — Reports & polish**
Reports tabs with charts → responsive pass (Section 12) → empty/loading/error state pass across every page → final connection check using Section 13's role interaction flows as a manual test script.

---

*End of document.*
