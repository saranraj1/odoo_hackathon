import { useAuth } from '../../providers/AuthProvider';
import { Role } from '../types';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || 'EMPLOYEE';

  return {
    role,
    // Admin specific permissions
    isAdmin: role === 'ADMIN',
    canManageDepartments: role === 'ADMIN',
    canManageCategories: role === 'ADMIN',
    canPromoteRoles: role === 'ADMIN',
    canCloseAudits: role === 'ADMIN',

    // Asset Manager specific permissions
    isAssetManager: role === 'ASSET_MANAGER',
    canRegisterAsset: role === 'ASSET_MANAGER',
    canEditAsset: role === 'ASSET_MANAGER',
    canAllocateAsset: role === 'ASSET_MANAGER',
    canApproveReturns: role === 'ASSET_MANAGER',
    canResolveDiscrepancies: role === 'ASSET_MANAGER',

    // Dept Head specific
    isDepartmentHead: role === 'DEPARTMENT_HEAD',
    canApproveDeptTransfers: role === 'DEPARTMENT_HEAD',
    canBookOnBehalfOfDept: role === 'DEPARTMENT_HEAD',

    // Employee specific
    isEmployee: role === 'EMPLOYEE',

    // Shared approval permissions
    canApproveTransfers: role === 'ASSET_MANAGER' || role === 'DEPARTMENT_HEAD',
    canApproveMaintenance: role === 'ASSET_MANAGER',
    canAssignTechnician: role === 'ASSET_MANAGER',

    // Scoped views checks
    canViewAllAssets: role === 'ADMIN' || role === 'ASSET_MANAGER',
    canViewAllActivityLogs: role === 'ADMIN' || role === 'ASSET_MANAGER',
    canViewAllReports: role === 'ADMIN' || role === 'ASSET_MANAGER',
  };
}
