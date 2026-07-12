import {
  User,
  Department,
  Category,
  Asset,
  Allocation,
  TransferRequest,
  Booking,
  MaintenanceRequest,
  AuditCycle,
  AuditItem,
  Notification,
  ActivityLog,
  Role,
} from '../types';

const BASE_URL = ''; // Proxied via next.config.js to http://localhost:3000

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public errors: any[] = []
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Fetch helper
async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', `Could not reach ${url}. Is the backend running?`);
  }

  if (response.status === 204) {
    return { success: true, data: null };
  }

  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();

  let json: any = null;
  if (rawBody.length === 0) {
    json = { success: response.ok, data: null };
  } else if (contentType.includes('application/json')) {
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new ApiError(
        response.status,
        'INVALID_JSON_RESPONSE',
        `The server returned malformed JSON for ${url} (status ${response.status}).`
      );
    }
  } else {
    const preview = rawBody.slice(0, 200).replace(/\s+/g, ' ').trim();
    throw new ApiError(
      response.status,
      'UNEXPECTED_RESPONSE_TYPE',
      `Expected a JSON response from ${url} but got "${contentType || 'unknown content-type'}" ` +
        `(status ${response.status}). Preview: ${preview}`
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      json?.code || 'UNKNOWN_ERROR',
      json?.message || `Server error (${response.status}) at ${url}`,
      json?.errors || []
    );
  }

  return json;
}

export const api = {
  auth: {
    signup: async (body: any): Promise<User> => {
      const res = await request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    login: async (body: any): Promise<User> => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    logout: async (): Promise<void> => {
      await request('/api/auth/logout', { method: 'POST' });
    },

    me: async (): Promise<User> => {
      const res = await request('/api/auth/me');
      return res.data;
    },

    changePassword: async (body: { currentPassword: string; newPassword: string }): Promise<void> => {
      await request('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },

    forgotPassword: async (body: { email: string }): Promise<void> => {
      await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },

  organization: {
    getDepartments: async (): Promise<Department[]> => {
      const res = await request('/api/departments');
      return res.data;
    },

    createDepartment: async (body: any): Promise<Department> => {
      const res = await request('/api/departments', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    updateDepartment: async (id: string, body: any): Promise<Department> => {
      const res = await request(`/api/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    getCategories: async (): Promise<Category[]> => {
      const res = await request('/api/categories');
      return res.data;
    },

    createCategory: async (body: any): Promise<Category> => {
      const res = await request('/api/categories', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    updateCategory: async (id: string, body: any): Promise<Category> => {
      const res = await request(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    getEmployees: async (filters: any): Promise<User[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/employees?${query}`);
      return res.data;
    },

    updateEmployee: async (id: string, body: any): Promise<User> => {
      const res = await request(`/api/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    promoteEmployee: async (id: string, role: Role): Promise<User> => {
      const res = await request(`/api/employees/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      return res.data;
    },
  },

  assets: {
    getAssets: async (filters: any): Promise<Asset[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/assets?${query}`);
      return res.data;
    },
    registerAsset: async (body: any): Promise<Asset> => {
      const res = await request('/api/assets', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    getAssetById: async (id: string): Promise<Asset> => {
      const res = await request(`/api/assets/${id}`);
      return res.data;
    },
    updateAsset: async (id: string, body: any): Promise<Asset> => {
      const res = await request(`/api/assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },
  },

  allocations: {
    getAllocations: async (filters: any = {}): Promise<Allocation[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/allocations?${query}`);
      return res.data;
    },
    allocateAsset: async (body: any): Promise<Allocation> => {
      const res = await request('/api/allocations', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    returnAsset: async (id: string, body: any): Promise<Allocation> => {
      const res = await request(`/api/allocations/${id}/return`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    getTransfers: async (filters: any = {}): Promise<TransferRequest[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/transfers?${query}`);
      return res.data;
    },
    createTransfer: async (body: any): Promise<TransferRequest> => {
      const res = await request('/api/transfers', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    updateTransfer: async (id: string, body: any): Promise<TransferRequest> => {
      const res = await request(`/api/transfers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },
  },

  bookings: {
    getBookings: async (filters: any = {}): Promise<Booking[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/bookings?${query}`);
      return res.data;
    },
    createBooking: async (body: any): Promise<Booking> => {
      const res = await request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    cancelBooking: async (id: string): Promise<void> => {
      await request(`/api/bookings/${id}/cancel`, {
        method: 'POST',
      });
    },
    rescheduleBooking: async (id: string, body: { startAt: string; endAt: string }): Promise<Booking> => {
      const res = await request(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },
  },

  maintenance: {
    getMaintenance: async (filters: any = {}): Promise<MaintenanceRequest[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/maintenance?${query}`);
      return res.data;
    },
    createRequest: async (body: any): Promise<MaintenanceRequest> => {
      const res = await request('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    updateRequest: async (id: string, body: any): Promise<MaintenanceRequest> => {
      const res = await request(`/api/maintenance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },
  },

  audits: {
    getCycles: async (filters: any = {}): Promise<AuditCycle[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/audits?${query}`);
      return res.data;
    },
    createCycle: async (body: any): Promise<AuditCycle> => {
      const res = await request('/api/audits', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    getCycleById: async (id: string): Promise<AuditCycle & { items: AuditItem[] }> => {
      const res = await request(`/api/audits/${id}`);
      return res.data;
    },
    activateCycle: async (id: string): Promise<AuditCycle> => {
      const res = await request(`/api/audits/${id}/activate`, { method: 'POST' });
      return res.data;
    },
    assignAuditors: async (id: string, body: { auditorIds: string[]; assignedScope: string }): Promise<AuditCycle> => {
      const res = await request(`/api/audits/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    submitItemVerification: async (cycleId: string, itemId: string, body: any): Promise<AuditItem> => {
      const res = await request(`/api/audits/${cycleId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    closeCycle: async (id: string): Promise<AuditCycle> => {
      const res = await request(`/api/audits/${id}/close`, {
        method: 'POST',
      });
      return res.data;
    },
  },

  notifications: {
    getNotifications: async (filters: any): Promise<Notification[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/notifications?${query}`);
      return res.data;
    },
    markNotificationRead: async (id: string): Promise<void> => {
      await request(`/api/notifications/${id}`, { method: 'PATCH' });
    },
    markAllNotificationsRead: async (): Promise<void> => {
      await request('/api/notifications/read-all', { method: 'POST' });
    },
  },

  reports: {
    getActivityLogs: async (filters: any = {}): Promise<ActivityLog[]> => {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/api/activity-logs?${query}`);
      return res.data;
    },
    getReportStats: async (): Promise<any> => {
      const res = await request('/api/reports');
      return res.data;
    },
  },

  dashboard: {
    getSnapshot: async (): Promise<any> => {
      const res = await request('/api/dashboard');
      return res.data;
    },
  },
};
