import { AssetStatus } from '@prisma/client';
import { InvalidStateTransitionError } from './errors';

const LEGAL_TRANSITIONS: Record<AssetStatus, Set<AssetStatus>> = {
  [AssetStatus.AVAILABLE]: new Set([
    AssetStatus.ALLOCATED,
    AssetStatus.RESERVED,
    AssetStatus.UNDER_MAINTENANCE,
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
  ]),
  [AssetStatus.UNDER_MAINTENANCE]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.ALLOCATED,
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
