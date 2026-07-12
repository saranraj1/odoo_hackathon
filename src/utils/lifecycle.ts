import { AssetStatus, MaintenanceStatus, AuditCycleStatus } from '@prisma/client';
import { InvalidStateTransitionError } from './errors';

const LEGAL_TRANSITIONS: Record<AssetStatus, Set<AssetStatus>> = {
  [AssetStatus.AVAILABLE]: new Set([
    AssetStatus.ALLOCATED,
    AssetStatus.RESERVED,
    AssetStatus.UNDER_MAINTENANCE,
    AssetStatus.LOST,
    AssetStatus.RETIRED,
    AssetStatus.DISPOSED,
  ]),
  [AssetStatus.ALLOCATED]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.UNDER_MAINTENANCE,
    AssetStatus.LOST,
    AssetStatus.RETIRED,
  ]),
  [AssetStatus.RESERVED]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.ALLOCATED,
    AssetStatus.UNDER_MAINTENANCE,
    AssetStatus.LOST,
  ]),
  [AssetStatus.UNDER_MAINTENANCE]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.ALLOCATED,
    AssetStatus.LOST,
    AssetStatus.RETIRED,
  ]),
  [AssetStatus.LOST]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.RETIRED,
    AssetStatus.DISPOSED,
  ]),
  [AssetStatus.RETIRED]: new Set([
    AssetStatus.DISPOSED,
  ]),
  [AssetStatus.DISPOSED]: new Set([]),
};

export function validateTransition(from: AssetStatus, to: AssetStatus): void {
  if (from === to) return; // No-op transition is allowed
  const allowed = LEGAL_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw new InvalidStateTransitionError(`Transition from ${from} to ${to} is invalid`);
  }
}

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  if (from === to) return true;
  return LEGAL_TRANSITIONS[from]?.has(to) ?? false;
}

const LEGAL_MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, Set<MaintenanceStatus>> = {
  [MaintenanceStatus.PENDING]: new Set([MaintenanceStatus.APPROVED, MaintenanceStatus.REJECTED]),
  [MaintenanceStatus.APPROVED]: new Set([MaintenanceStatus.TECHNICIAN_ASSIGNED]),
  [MaintenanceStatus.REJECTED]: new Set([]),
  [MaintenanceStatus.TECHNICIAN_ASSIGNED]: new Set([MaintenanceStatus.IN_PROGRESS]),
  [MaintenanceStatus.IN_PROGRESS]: new Set([MaintenanceStatus.RESOLVED]),
  [MaintenanceStatus.RESOLVED]: new Set([]),
};

export function validateMaintenanceTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
  const allowed = LEGAL_MAINTENANCE_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw new InvalidStateTransitionError(`Maintenance transition from ${from} to ${to} is invalid`);
  }
}

const LEGAL_AUDIT_CYCLE_TRANSITIONS: Record<AuditCycleStatus, Set<AuditCycleStatus>> = {
  [AuditCycleStatus.DRAFT]: new Set([AuditCycleStatus.ACTIVE]),
  [AuditCycleStatus.ACTIVE]: new Set([AuditCycleStatus.CLOSED]),
  [AuditCycleStatus.CLOSED]: new Set([]),
};

export function validateAuditCycleTransition(from: AuditCycleStatus, to: AuditCycleStatus): void {
  const allowed = LEGAL_AUDIT_CYCLE_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw new InvalidStateTransitionError(`Audit cycle transition from ${from} to ${to} is invalid`);
  }
}
