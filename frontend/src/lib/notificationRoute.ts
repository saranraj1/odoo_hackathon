const ENTITY_ROUTES: Record<string, (entityId: string) => string> = {
  Asset: (id) => `/assets/${id}`,
  Allocation: () => '/allocations',
  TransferRequest: () => '/allocations',
  Booking: () => '/bookings',
  MaintenanceRequest: () => '/maintenance',
  AuditCycle: (id) => `/audits/${id}`,
  AuditItem: () => '/audits',
};

export function getNotificationRoute(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId || !ENTITY_ROUTES[entityType]) return null;
  return ENTITY_ROUTES[entityType](entityId);
}
