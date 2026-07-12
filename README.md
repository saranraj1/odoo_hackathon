# AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a centralized, industry-neutral ERP platform designed to track, allocate, and maintain physical assets and shared resources within an organization. It helps businesses reduce manual tracking inefficiencies, prevent double-allocations, manage bookings without conflicts, and handle structured audit cycles and maintenance workflows.

This repository is built as a **Modular Monolith** using **Node.js, TypeScript, Express, and PostgreSQL** as the core backend, with **Prisma ORM** managing database access and migrations.

---

## 🛠️ Technology Stack
- **Backend Framework**: Node.js + Express
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM & Migrations**: Prisma ORM
- **Request Validation**: Zod
- **Authentication**: JWT stored in secure HTTP-only cookies
- **Password Hashing**: bcryptjs
- **Testing Suite**: Vitest + Supertest
- **Logging**: Pino structured logger

---

## 👥 Team Ownership & Roles
- **Member 1 (Backend/API Lead)**: Core project skeleton, database schema, authentication, RBAC middleware, activity logging, notification services, and organization setup API (Departments, Categories, Employee Directory).
- **Member 2 (Asset Lifecycle Lead)**: Asset registration, asset tags, asset search/filtering, lifecycle state machine, allocation workflow, transfer request approvals, and return processing.
- **Member 3 (Booking & Maintenance Lead)**: Shared resource bookings with overlap validation, cancellation/rescheduling, maintenance request routing, approval workflow, and technician assignment.
- **Member 4 (Audit, Dashboard & Reports Lead)**: Audit cycles, auditor assignment, audit items snapshotting, discrepancy reports, dashboard KPIs, notification delivery, activity logs directory, and final QA.

---

## ⚙️ Development Setup

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database instance
- npm

### 2. Environment Variables
Create a `.env` file in the root directory and copy the contents of `.env.example`:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5403/assetflow?schema=public"
JWT_SECRET="your-super-secure-jwt-secret-key-change-in-production"
NODE_ENV="development"
```

### 3. Installation
Install project dependencies:
```bash
npm install
```

### 4. Database Setup & Migrations
Run the migrations to create the database tables:
```bash
npx prisma migrate dev --name init
```

### 5. Seed Database
Seed the database with default departments, categories, and test accounts:
```bash
npm run seed
```

### 6. Run Application
Start the development server:
```bash
npm run dev
```

### 7. Run Tests
Execute the automated test suite:
```bash
npm run test
```

---

