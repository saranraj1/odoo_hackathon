# AssetFlow — Enterprise Asset & Resource Management System

> A conflict-safe, role-aware ERP platform for managing organizational assets, shared resources, maintenance operations, and structured audits.

---

## 📖 Overview

AssetFlow is a centralized, industry-neutral Enterprise Resource Planning platform designed to track, allocate, reserve, maintain, audit, and report on physical assets and shared organizational resources.

Organizations often manage laptops, equipment, furniture, vehicles, rooms, and machinery through spreadsheets, paper registers, emails, and disconnected calendars. These methods make it difficult to know who holds an asset, where it is located, when it must be returned, whether it is under maintenance, and whether another person has already reserved it.

AssetFlow replaces these fragmented processes with one connected operational system. It provides a reliable source of truth for departments, employees, assets, allocations, transfers, bookings, maintenance requests, audit cycles, notifications, and activity history.

The platform is not limited to a particular industry. It can support offices, schools, universities, hospitals, factories, agencies, nonprofit organizations, laboratories, and other institutions that manage physical assets or shared facilities.

This repository uses a **Modular Monolith** architecture. The backend is built with **Node.js, TypeScript, Express, and PostgreSQL**, while **Prisma ORM** manages relational data access, schema migrations, and seed data.

---

## 🎯 Project Mission

AssetFlow aims to deliver a complete and understandable ERP workflow rather than a collection of disconnected CRUD screens.

The system allows an organization to:

- Configure departments, department hierarchies, asset categories, and employees.
- Register assets with generated asset tags and unique serial numbers.
- Track assets through controlled lifecycle states.
- Allocate assets to employees or departments without double-allocation.
- Request and approve transfers while preserving allocation history.
- Return assets with condition and check-in notes.
- Book shared resources without time-slot overlaps.
- Route maintenance requests through approval before repair begins.
- Assign technicians and preserve maintenance history.
- Run scoped audit cycles with assigned auditors.
- Generate discrepancy reports for Missing or Damaged assets.
- Surface overdue activity through dashboards and notifications.
- Record important operations in an append-only activity log.

---

## 💡 Why AssetFlow Matters

Without a connected asset-management system, organizations commonly experience:

- Duplicate or conflicting asset assignments.
- Unknown asset holders and locations.
- Unrecorded transfers and returns.
- Overlapping reservations for shared resources.
- Maintenance work beginning without authorization.
- Missing repair history and cost records.
- Overdue assets with no reminders.
- Slow manual audits and unreliable discrepancy reports.
- Weak accountability for operational decisions.
- Dashboards that do not reflect current database records.

AssetFlow solves these problems by combining business rules, relational integrity, server-side authorization, state validation, database transactions, notifications, and immutable history.

---

## ✨ Core Features

### 🔐 Authentication and Secure Role Administration

- Email and password registration and login.
- Public signup always creates an `EMPLOYEE` account.
- No role selector is exposed during signup.
- Client-supplied privileged roles are ignored or rejected.
- Only an Admin can promote an Employee.
- JWT authentication is stored in secure HTTP-only cookies.
- Passwords are hashed using `bcryptjs`.
- Protected APIs validate authentication, account status, role, and data scope.
- Inactive users cannot sign in or receive new assignments.

### 🏢 Organization Setup

- Create, edit, and deactivate departments.
- Configure optional parent departments.
- Assign Department Heads.
- Create and maintain asset categories.
- Store optional category-specific metadata.
- Manage the Employee Directory.
- Assign departments, roles, and Active or Inactive status.

### 💻 Asset Registration and Directory

- Register assets with generated tags such as `AF-0001`.
- Enforce unique asset tags and serial numbers.
- Record acquisition date and cost.
- Track location, department, category, condition, and status.
- Mark assets as normal allocatable assets or shared bookable resources.
- Attach photos and supporting documents when storage is configured.
- Search and filter by tag, serial number, QR code, category, status, department, or location.
- Display allocation and maintenance history on each asset detail page.

### 🔄 Allocation, Transfer, and Return

- Allocate an Available asset to an employee or department.
- Store an optional expected-return date.
- Prevent more than one active allocation per asset.
- Show the current holder when a conflicting allocation is attempted.
- Offer a Transfer Request instead of creating a duplicate allocation.
- Approve or reject transfers.
- Close the previous allocation and create the next allocation atomically.
- Return assets with condition and check-in notes.
- Flag allocations when their expected-return date has passed.

### 📅 Shared-Resource Booking

- Display bookable assets in a calendar-oriented workflow.
- Create reservations with start and end date-time values.
- Reject overlapping bookings.
- Allow adjacent bookings when one starts exactly when another ends.
- Cancel and reschedule bookings.
- Track Upcoming, Ongoing, Completed, and Cancelled states.
- Generate confirmation, cancellation, and reminder notifications.

### 🛠️ Maintenance Management

- Raise maintenance requests with issue, priority, and optional evidence.
- Require Asset Manager approval before repair begins.
- Approve or reject requests with decision notes.
- Change the asset to Under Maintenance after approval.
- Assign any active employee as technician.
- Track work from Technician Assigned to In Progress and Resolved.
- Record repair work, cost, date, and resulting condition.
- Restore the asset to a valid Available or Allocated state after resolution.

### 🔎 Structured Asset Audits

- Create audit cycles with department or location scope.
- Define audit start and end dates.
- Assign one or more Employees as temporary auditors.
- Snapshot in-scope assets when the cycle is activated.
- Mark audit items as Verified, Missing, or Damaged.
- Store notes and optional evidence.
- Generate discrepancy reports automatically.
- Resolve discrepancies through the Asset Manager.
- Close and lock completed audit cycles.

### 📊 Dashboard and Reports

The role-aware Dashboard contains the required operational KPIs:

- Assets Available.
- Assets Allocated.
- Maintenance Today.
- Active Bookings.
- Pending Transfers.
- Upcoming Returns.

Overdue returns are highlighted separately. Quick actions include Register Asset, Book Resource, and Raise Maintenance Request.

Report views can include:

- Asset utilization.
- Most-used and idle assets.
- Maintenance frequency by asset or category.
- Assets due for maintenance.
- Assets approaching retirement.
- Department-wise allocation.
- Resource-booking heatmaps.
- Audit discrepancies.
- Repair-cost trends.
- Exportable operational reports.

### 🔔 Notifications and Activity Logs

Notification examples include Asset Assigned, Transfer Approved, Maintenance Approved or Rejected, Booking Confirmed, Booking Cancelled, Booking Reminder, Overdue Return, Audit Assignment, and Audit Discrepancy.

Every important mutation creates an append-only Activity Log containing the actor, action, entity, timestamp, and relevant before-and-after information.

---

## 🧱 Architecture

AssetFlow follows a **Modular Monolith** architecture.

A Modular Monolith keeps the application in one deployable backend while separating business capabilities into clearly owned modules. This approach provides faster development and simpler deployment than microservices while avoiding an unstructured codebase.

```text
Client Application
       │
       ▼
Express REST API
       │
       ├── Authentication and RBAC
       ├── Organization Module
       ├── Asset Module
       ├── Allocation and Transfer Module
       ├── Booking Module
       ├── Maintenance Module
       ├── Audit Module
       ├── Notification Module
       └── Reporting Module
       │
       ▼
Prisma ORM
       │
       ▼
PostgreSQL Database
```

### Architecture Layers

| Layer | Responsibility |
| --- | --- |
| API Layer | Routes, request parsing, authentication, and response formatting |
| Validation Layer | Zod schemas for parameters, query strings, and request bodies |
| Authorization Layer | Role and record-level data-scope checks |
| Service Layer | Business rules, lifecycle validation, conflicts, and transactions |
| Repository Layer | Prisma queries and persistence operations |
| Event Layer | Activity logs and user notifications |
| Database Layer | PostgreSQL constraints, relations, indexes, and durable history |

---

## 🛠️ Technology Stack

| Area | Technology | Purpose |
| --- | --- | --- |
| Runtime | Node.js | Executes the backend application |
| Backend Framework | Express | REST API routing and middleware |
| Language | TypeScript | Type safety and maintainable contracts |
| Database | PostgreSQL | Relational operational data storage |
| ORM and Migrations | Prisma ORM | Schema management, queries, and migrations |
| Request Validation | Zod | Runtime validation of API inputs |
| Authentication | JWT in HTTP-only cookies | Secure authenticated sessions |
| Password Hashing | bcryptjs | One-way password protection |
| Testing | Vitest and Supertest | Unit and API integration testing |
| Logging | Pino | Structured application and error logs |
| Development | tsx | TypeScript execution during development |

---

## 👥 User Roles and Access Model

### 👑 Admin

The Admin manages departments, categories, employee records, role assignments, audit-cycle administration, organization-wide analytics, and activity visibility.

### 🧰 Asset Manager

The Asset Manager registers assets, performs allocations, approves transfers and returns, approves maintenance, assigns technicians, resolves discrepancies, and controls sensitive lifecycle transitions.

### 🏬 Department Head

The Department Head views authorized department data, handles department-scoped allocation or transfer decisions, books resources for the department, and accesses department reports.

### 👤 Employee

The Employee views personal assets, creates bookings, raises maintenance requests, initiates transfers or returns, reads notifications, and performs temporary technician or auditor tasks when explicitly assigned.

### 🛡️ Authorization Sequence

Every protected request follows this order:

1. Confirm that a valid JWT is present.
2. Load the current user.
3. Confirm that the account is Active.
4. Check whether the role permits the requested operation.
5. Apply organization, department, own-record, or assigned-task scope.
6. Validate request data.
7. Validate workflow state and conflicts.
8. Execute the business operation.
9. Write the activity log and notifications.
10. Return a standardized response.

---

## 🔁 Asset Lifecycle State Machine

```text
AVAILABLE -> ALLOCATED | RESERVED | UNDER_MAINTENANCE | RETIRED | DISPOSED
ALLOCATED -> AVAILABLE | UNDER_MAINTENANCE | LOST | RETIRED
RESERVED -> AVAILABLE | ALLOCATED | UNDER_MAINTENANCE
UNDER_MAINTENANCE -> AVAILABLE | ALLOCATED | RETIRED
LOST -> AVAILABLE | RETIRED | DISPOSED
RETIRED -> DISPOSED
```

Invalid transitions return a conflict response:

```json
{
  "success": false,
  "code": "INVALID_STATE_TRANSITION",
  "message": "The requested asset lifecycle transition is not allowed."
}
```

The frontend may hide invalid actions, but the backend remains the final authority.

---

## ⏱️ Booking Conflict Rule

A requested booking overlaps an existing active booking when:

```text
requestedStart < existingEnd AND requestedEnd > existingStart
```

Example:

```text
Existing booking: 09:00 to 10:00
Requested booking: 09:30 to 10:30
Result: Rejected
```

Adjacent bookings are valid:

```text
Existing booking: 09:00 to 10:00
Requested booking: 10:00 to 11:00
Result: Accepted
```

Example error response:

```json
{
  "success": false,
  "code": "BOOKING_OVERLAP",
  "message": "This resource is already booked from 09:00 to 10:00."
}
```

---

## 🔧 Maintenance Workflow

```text
PENDING
   ├── REJECTED
   └── APPROVED -> TECHNICIAN_ASSIGNED -> IN_PROGRESS -> RESOLVED
```

Only approval moves the asset to `UNDER_MAINTENANCE`. Rejection leaves its operational state unchanged. Resolution records the work, cost, condition, and completion date before restoring a valid operational state.

---

## 🔍 Audit Workflow

```text
DRAFT -> ACTIVE -> CLOSED
```

1. Admin creates a Draft cycle.
2. Admin defines scope and assigns auditors.
3. Activation snapshots all in-scope assets.
4. Assigned auditors mark items Verified, Missing, or Damaged.
5. Missing and Damaged items become discrepancies.
6. Asset Manager resolves discrepancies.
7. Admin closes the cycle.
8. Closed audit records become immutable.

---

## 🗃️ Core Data Model

| Entity | Main Responsibility |
| --- | --- |
| User | Authentication, role, status, and department membership |
| Department | Organizational hierarchy and department ownership |
| AssetCategory | Asset classification and optional metadata schema |
| Asset | Current asset identity, state, condition, location, and ownership |
| AssetDocument | Photos and supporting files associated with assets |
| Allocation | Employee or department holding history |
| TransferRequest | Controlled movement between allocation holders |
| Booking | Time-slot reservations for bookable resources |
| MaintenanceRequest | Repair approval, assignment, work, and resolution |
| AuditCycle | Audit scope, dates, status, and closure information |
| AuditAssignment | Temporary assignment of an auditor |
| AuditItem | Snapshot and verification result for an audited asset |
| Notification | User-facing event, reminder, and read state |
| ActivityLog | Append-only history of important operations |

### Database Integrity Rules

- Asset tags and serial numbers are unique.
- User email addresses are unique.
- Only one active allocation is allowed per asset.
- An allocation targets either an Employee or a Department, never both.
- Booking end time must be later than start time.
- Active bookings for one resource cannot overlap.
- Each asset appears only once in a particular audit cycle.
- Closed audit cycles and their items are immutable.
- Historical operational records are never hard-deleted.
- Inactive users cannot receive new allocations or assignments.
- Maintenance cannot begin before approval.
- Transfer and maintenance state changes use database transactions.

---

## 🔌 API Response Contract

Successful response:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully."
}
```

Error response:

```json
{
  "success": false,
  "code": "STABLE_ERROR_CODE",
  "message": "A clear explanation of the error."
}
```

Expected HTTP status codes:

| Status | Meaning |
| --- | --- |
| 200 | Successful read or update |
| 201 | Resource created successfully |
| 400 | Invalid request data |
| 401 | Authentication required |
| 403 | Insufficient permission or data scope |
| 404 | Resource not found |
| 409 | State, allocation, or booking conflict |
| 500 | Unexpected server failure |

Production responses must never expose stack traces or secrets.

---

## 🛣️ API Overview

### Authentication

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/auth/forgot-password
```

### Organization

```text
GET    /api/departments
POST   /api/departments
PATCH  /api/departments/:id
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
GET    /api/employees
PATCH  /api/employees/:id
PATCH  /api/employees/:id/role
```

### Assets, Allocation, and Transfers

```text
GET   /api/assets
POST  /api/assets
GET   /api/assets/:id
PATCH /api/assets/:id
GET   /api/assets/:id/history
POST  /api/assets/:id/allocate
POST  /api/allocations/:id/return
POST  /api/assets/:id/transfer
GET   /api/transfers
PATCH /api/transfers/:id/decision
```

### Booking, Maintenance, and Audits

```text
GET   /api/bookings
POST  /api/bookings
PATCH /api/bookings/:id
GET   /api/maintenance
POST  /api/maintenance
PATCH /api/maintenance/:id/decision
PATCH /api/maintenance/:id/assign
PATCH /api/maintenance/:id/status
GET   /api/audits
POST  /api/audits
POST  /api/audits/:id/assign
PATCH /api/audits/:id/items/:itemId
POST  /api/audits/:id/close
```

### Dashboard and Operations

```text
GET   /api/dashboard
GET   /api/reports
GET   /api/notifications
PATCH /api/notifications/:id
GET   /api/activity-logs
```

---

## 📁 Suggested Project Structure

```text
src
├── app.ts
├── server.ts
├── config
├── common
│   ├── errors
│   ├── middleware
│   ├── logger
│   ├── response
│   └── validation
├── modules
│   ├── auth
│   ├── organization
│   ├── assets
│   ├── allocations
│   ├── transfers
│   ├── bookings
│   ├── maintenance
│   ├── audits
│   ├── notifications
│   ├── activity-logs
│   └── reports
├── jobs
├── tests
└── types

prisma
├── schema.prisma
├── migrations
└── seed.ts
```

Each module should contain its route, controller, validation schema, service, repository, types, and tests where appropriate.

---

## ⚙️ Development Setup

### 1. Prerequisites

Install the following software before running AssetFlow:

- **Node.js** version 18 or newer.
- **PostgreSQL** database server.
- **npm** package manager.
- **Git** for source control.

Verify the installations:

```bash
node --version
npm --version
psql --version
git --version
```

### 2. Clone the Repository

```bash
git clone <repository-url>
cd assetflow
```

### 3. Environment Variables

Create a `.env` file in the project root. Copy the structure from `.env.example` and replace placeholder values.

```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5403/assetflow?schema=public"
JWT_SECRET="your-super-secure-jwt-secret-key-change-in-production"
NODE_ENV="development"
```

Never commit the real `.env` file or production secrets.

### 4. Install Dependencies

```bash
npm install
```

### 5. Generate the Prisma Client

```bash
npx prisma generate
```

### 6. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

### 7. Seed the Database

Seed the database with demonstration departments, categories, users, assets, bookings, maintenance requests, and audit records.

```bash
npm run seed
```

### 8. Start the Development Server

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

### 9. Run Tests

```bash
npm run test
```

### 10. Optional Quality Commands

Use the scripts defined by the project when available:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 🧪 Testing Strategy

### Unit Tests

Unit tests validate lifecycle transitions, overlap detection, authorization rules, overdue calculations, tag generation, and maintenance transitions.

### Integration Tests

Integration tests validate API routes, Prisma operations, transactions, constraints, cookies, authentication, and standardized responses.

### End-to-End Workflow Tests

End-to-end tests validate complete user journeys, including role promotion, asset registration, allocation conflicts, transfer approval, booking overlap, maintenance approval, audit discrepancies, and dashboard updates.

### Critical Test Cases

- Signup always creates an Employee.
- Only Admin can assign privileged roles.
- Inactive users cannot sign in or receive allocations.
- Duplicate asset tags and serial numbers are rejected.
- An allocated asset cannot receive a second active allocation.
- Transfer approval preserves old and new allocation history.
- Overdue allocations appear on the Dashboard.
- `09:30–10:30` conflicts with `09:00–10:00`.
- `10:00–11:00` succeeds after `09:00–10:00`.
- Cancelled bookings no longer block their slots.
- Maintenance cannot start before approval.
- Closed audits cannot be modified.
- Missing and Damaged audit items become discrepancies.
- Every important mutation creates an Activity Log.
- Employees cannot access administrative operations.

---

## 🎬 Demonstration Flow

1. Register a new user and prove the account becomes Employee.
2. Sign in as Admin and promote a prepared user.
3. Display departments, categories, and the Employee Directory.
4. Register a bookable asset and show its generated tag.
5. Allocate an asset to an employee.
6. Attempt a conflicting allocation and create a Transfer Request.
7. Approve the transfer and display both allocation records.
8. Attempt an overlapping Room B2 booking and show the conflict.
9. Create an adjacent valid booking.
10. Raise and approve a maintenance request.
11. Assign a technician and resolve the work.
12. Mark an audit item Missing and generate a discrepancy.
13. Close the audit cycle.
14. Finish on the Dashboard, Notifications, and Activity Logs.

This narrative demonstrates connected ERP behavior instead of isolated CRUD operations.

---

## 🔒 Security Principles

- Hash all passwords using `bcryptjs`.
- Store JWTs in secure HTTP-only cookies.
- Use `Secure` cookies in production.
- Configure an appropriate `SameSite` policy.
- Validate every request using Zod.
- Enforce role and data scope on the server.
- Use Prisma parameterization rather than constructing unsafe SQL.
- Keep secrets in environment variables.
- Never return password hashes.
- Never expose production stack traces.
- Record sensitive decisions in Activity Logs.
- Deactivate users instead of deleting historical identity references.
- Apply rate limiting and login protection before production release.

> Hiding a button is not authorization. Every protected API operation must independently verify the requester.

---

## 🚀 Deployment Checklist

- [ ] Production environment variables are configured.
- [ ] JWT secrets are strong and private.
- [ ] PostgreSQL is reachable from the application.
- [ ] Prisma migrations are applied.
- [ ] Seed data or demonstration accounts are available where required.
- [ ] HTTPS is enabled.
- [ ] Secure cookie options are enabled.
- [ ] Logs do not expose credentials or tokens.
- [ ] The application opens in a private browser session.
- [ ] Main workflows pass on desktop and mobile.
- [ ] Database records persist after restart.
- [ ] README commands have been tested.
- [ ] Repository access and deployed URLs work.
- [ ] No incomplete feature is presented as complete.

---

## 🗺️ Future Roadmap

- Explainable Asset Health Score.
- Predictive maintenance recommendations.
- Replacement-risk analysis.
- QR-code and barcode scanning.
- Email and push notifications.
- Calendar integrations.
- Cloud document storage.
- Advanced report exports.
- Custom report builder.
- Offline audit mode.
- Mobile application.
- Internationalization.
- More granular permission policies.

Optional improvements should begin only after all core workflows are stable, tested, and deployable.

---

## 🤝 Contribution Guidelines

1. Create a focused feature branch.
2. Keep commits small and descriptive.
3. Add tests for important business rules.
4. Do not change frozen states or API contracts without team agreement.
5. Coordinate edits to shared files.
6. Run linting, type checking, and tests before merging.
7. Explain database migrations clearly.
8. Never commit credentials or secrets.
9. Preserve operational history.
10. Update this README whenever setup or behavior changes.

Recommended branches:

```text
main
integration
feature/platform-organization
feature/asset-lifecycle
feature/booking-maintenance
feature/audit-operations
```

Stable slices merge into `integration`. Only tested checkpoints move to `main`.

---

## 🧭 Engineering Principles

1. **Plan before coding.** Freeze roles, states, schema, API contracts, and the demo journey.
2. **Model history separately.** Allocations, transfers, bookings, maintenance, and audits need dedicated records.
3. **Build connected workflows.** Approved actions update state, history, notifications, and dashboard data.
4. **Enforce security on the server.** Navigation visibility is not authorization.
5. **Use transactions.** Multi-record workflows must not leave partial data.
6. **Deploy early.** Production behavior is part of application quality.
7. **Use realistic data.** Clear examples make the system understandable.
8. **Prioritize stable core requirements.** Optional features must not weaken required workflows.
9. **Explain every detail page.** Show What, Who, When, Why, Next Action, and History.

---

## 👨‍💻 Team Contributions

### 🎨 Sabarivasan E — Frontend

Responsible for the user interface, responsive layouts, role-aware navigation, workflow screens, forms, tables, calendars, loading states, empty states, validation feedback, error handling, and overall usability.

### ⚙️ Saran Raj U — Backend

Responsible for the project skeleton, Express APIs, TypeScript contracts, Prisma schema, authentication, RBAC middleware, business services, lifecycle validation, transactions, structured errors, and PostgreSQL data integrity.

### 🔗 Mohith R — Integrations

Responsible for connecting frontend and backend modules, aligning API contracts, integrating notifications and activity events, coordinating cross-module workflows, supporting deployment configuration, and ensuring that AssetFlow operates as one connected ERP platform.

### ✅ Naveen Kumar N — Testing

Responsible for test planning, Vitest and Supertest coverage, permission testing, conflict testing, transaction verification, regression testing, responsive validation, deployment quality assurance, and final demonstration reliability.

---

## 📄 License

Add the selected project license in the repository before public distribution.

---

<p align="center"><strong>AssetFlow transforms asset records into connected, accountable, and conflict-safe organizational workflows.</strong></p>
