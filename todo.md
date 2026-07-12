# AssetFlow Project TODOs — All Members

This file tracks the status of implementations across all four team members. Use `[ ]` for uncompleted, `[/]` for in-progress, and `[x]` for completed tasks.

---

## 👥 Member 1: Platform, Shared Foundation, Database & Organization
*Responsible for the shared backend, schema, auth, and organization master data.*

- [ ] **Core Project Scaffold**
  - [ ] Initialize Node.js environment, typescript settings, and package dependencies.
  - [ ] Configure Pino structured logger and global config parser with environment validations.
  - [ ] Design central error handler middleware and standard JSON response envelope.
- [ ] **Shared Prisma Schema & Migrations**
  - [ ] Complete database tables for all members: `User`, `Department`, `Category`, `Asset`, `AssetDocument`, `Allocation`, `TransferRequest`, `Booking`, `MaintenanceRequest`, `AuditCycle`, `AuditAssignment`, `AuditItem`, `Notification`, `ActivityLog`.
  - [ ] Apply indexes (tags, status, time ranges, and foreign keys) and constraints.
  - [ ] Configure custom PostgreSQL partial index to enforce only one active allocation per asset.
- [ ] **Authentication & Sessions**
  - [ ] Create signup endpoint (always creates `EMPLOYEE` role).
  - [ ] Create login/logout endpoints using JWT stored in secure HTTP-only cookies.
  - [ ] Create `GET /api/auth/me` current user endpoint.
  - [ ] Implement active-user check middleware (block deactivated users).
- [ ] **Authorization & RBAC Middleware**
  - [ ] Create `requireRole` middleware enforcing `ADMIN`, `ASSET_MANAGER`, `DEPARTMENT_HEAD`, and `EMPLOYEE` permissions.
  - [ ] Build record-level scopes: Organization-wide, Department-scoped, Own records, or Assigned tasks.
- [ ] **Organization Setup API (Admin-Only)**
  - [ ] Implement Department CRUD & deactivation (preserving historical relationships, blocking new attachments).
  - [ ] Implement Category CRUD & deactivation.
  - [ ] Implement Employee Directory list/filters, department assignment, and Admin-only role promotion.
- [ ] **Shared Backend Services**
  - [ ] Implement `ActivityLog` writer service (append-only).
  - [ ] Implement `Notification` creator service and CRUD endpoints.
  - [ ] Develop `lifecycle.ts` containing the valid asset state-machine checks.
- [ ] **Demo Seed Dataset & Tests**
  - [ ] Create robust database seeder with baseline demo data (Admin, Manager, Dept Head, Employees, Departments, Categories).
  - [ ] Write integration tests for auth, RBAC, scopes, and master data.

---

## 👥 Member 2: Asset Lifecycle, Registration & Directory
*Responsible for asset registration, tag auto-generation, allocation conflict checks, transfers, and return workflows.*

- [ ] **Asset Registration & Document Upload**
  - [ ] Endpoint `POST /api/assets` to register an asset (validates Category schema, auto-generates Asset Tag e.g. `AF-XXXX`).
  - [ ] Endpoint `PATCH /api/assets/:id` to edit asset info (requires Asset Manager).
  - [ ] Document/photo attachment metadata storage under `AssetDocument`.
- [ ] **Asset Directory Search & Filtering**
  - [ ] Endpoint `GET /api/assets` with pagination and filters (tag, category, serial number, status, department, location).
  - [ ] Endpoint `GET /api/assets/:id` returning detailed data and lifecycle history.
- [ ] **Asset Allocation Workflow**
  - [ ] Endpoint `POST /api/assets/:id/allocate` (checks if `AVAILABLE`, sets to `ALLOCATED`, creates `Allocation`).
  - [ ] Double-allocation block rule (if already allocated, fail and show current holder details).
- [ ] **Asset Transfer Workflow**
  - [ ] Endpoint `POST /api/assets/:id/transfer` (allows requesting a transfer for already-allocated assets).
  - [ ] Endpoint `PATCH /api/transfers/:id/decision` (Asset Manager or Department Head approval: closes old allocation and opens new allocation in a single transaction).
- [ ] **Asset Return Workflow**
  - [ ] Endpoint `POST /api/allocations/:id/return` (returns asset, captures condition check-in notes, updates asset to `AVAILABLE`).
- [ ] **Overdue Allocations Job**
  - [ ] Script/method to flag overdue allocations (past Expected Return Date) and generate notifications.

---

## 👥 Member 3: Shared-Resource Booking & Maintenance
*Responsible for bookable resources, overlap validations, calendar, maintenance routing, approvals, and resolutions.*

- [ ] **Shared-Resource Booking**
  - [ ] Filter assets with `isBookable=true` for scheduling.
  - [ ] Endpoint `GET /api/bookings` to view resource calendars and existing schedules.
  - [ ] Endpoint `POST /api/bookings` to book a resource.
  - [ ] Overlap validation rule: reject if `requestedStart < existingEnd AND requestedEnd > existingStart` (allow adjacent slots).
  - [ ] Endpoint `PATCH /api/bookings/:id` to cancel or reschedule bookings.
- [ ] **Maintenance Request Routing**
  - [ ] Endpoint `POST /api/maintenance` (allows employee to raise request for assets they hold/use).
  - [ ] Endpoint `PATCH /api/maintenance/:id/decision` (Asset Manager approves/rejects; updates asset status to `UNDER_MAINTENANCE` on approval).
- [ ] **Technician Assignment & Resolution**
  - [ ] Endpoint `PATCH /api/maintenance/:id/assign` (assigns any active employee as technician).
  - [ ] Endpoint `PATCH /api/maintenance/:id/status` (updates status from `Technician Assigned` -> `In Progress` -> `Resolved`).
  - [ ] Transaction-safe resolution endpoint (records cost, resolution notes, and restores the asset's prior state `AVAILABLE` or `ALLOCATED`).

---

## 👥 Member 4: Audit Operations, Dashboard & Reports
*Responsible for audit cycles, verification snapshots, discrepancy tracking, dashboard widgets, notification UI, and reporting.*

- [ ] **Audit Cycle Workflow**
  - [ ] Endpoint `POST /api/audits` (Admin creates audit cycle with department/location scope and date range).
  - [ ] Endpoint `POST /api/audits/:id/assign` (assigns employee auditors).
  - [ ] Activates audit cycle: snapshots all matching assets into `AuditItem` records.
- [ ] **Audit Verification & Closure**
  - [ ] Endpoint `PATCH /api/audits/:id/items/:itemId` (auditor verifies asset as `VERIFIED`, `MISSING`, or `DAMAGED` with notes).
  - [ ] Auto-generates discrepancies report based on `MISSING`/`DAMAGED` items.
  - [ ] Endpoint `POST /api/audits/:id/close` (locks cycle as immutable, updates missing assets status to `LOST`).
- [ ] **Dashboard KPI Aggregations**
  - [ ] Endpoint `GET /api/dashboard` returning totals for: Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, and Upcoming Returns (high-priority overdue sections).
- [ ] **Reports & Heatmaps**
  - [ ] Endpoint `GET /api/reports` providing usage trends, maintenance frequency, and resource booking heatmaps.
- [ ] **Activity Log Directory & Notifications UI**
  - [ ] Interface to list global notifications and full audit log (who did what, when).
