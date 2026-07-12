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

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'omit',
  });

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new ApiError(response.status, 'PARSE_ERROR', 'Failed to parse JSON response');
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      json?.code || 'UNKNOWN_ERROR',
      json?.message || 'Server error',
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
  },
};
