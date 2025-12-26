import axios from 'axios';

// Use environment variable or fallback to relative path for production
// In production (Nginx), API is proxied at /api
// In development, use localhost:5000
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'
);

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Add response interceptor to handle token expiration and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest?.url?.includes('/auth/login');
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

    // 401 에러이고, 로그인/리프레시 요청이 아니며, 재시도하지 않은 요청인 경우
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 토큰 갱신 중이면 큐에 추가하고 대기
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Refresh token이 없으면 로그인 페이지로
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Refresh token으로 새 access token 발급
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { access_token } = response.data;
        localStorage.setItem('token', access_token);

        // 큐에 있는 요청들 처리
        processQueue();

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token도 만료되었으면 로그아웃
        processQueue(refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 로그인 요청 자체 실패는 그냥 에러 반환
    if (isLoginRequest) {
      return Promise.reject(error);
    }

    // 다른 401 에러나 기타 에러
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) => {
    // Map username to email for backend compatibility
    return api.post('/api/auth/login', {
      email: credentials.username,
      password: credentials.password
    });
  },

  logout: () => api.post('/api/auth/logout'),

  getCurrentUser: () => api.get('/api/auth/me'),

  register: (userData: {
    username: string;
    password: string;
    email: string;
    role: string;
    permissions: string[];
  }) => api.post('/api/auth/register', userData),
};

// User Management API
export const userAPI = {
  getUsers: () => api.get('/api/users'),
  getUserById: (id: number) => api.get(`/api/users/${id}`),
  getTechnicians: () => api.get('/api/users/technicians'),
  createUser: (userData: any) => api.post('/api/users', userData),
  updateUser: (id: number, userData: any) => api.put(`/api/users/${id}`, userData),
  deleteUser: (id: number) => api.delete(`/api/users/${id}`),
};

// Customer API
export const customerAPI = {
  getCustomers: (params?: { include_resources?: boolean; keyword?: string; page?: number; per_page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.include_resources) searchParams.append('include_resources', 'true');
    if (params?.keyword) searchParams.append('keyword', params.keyword);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());

    const queryString = searchParams.toString();
    return api.get(`/api/customers/${queryString ? `?${queryString}` : ''}`);
  },
  getCustomerById: (id: number) => api.get(`/api/customers/${id}`),
  createCustomer: (customerData: any) => api.post('/api/customers/', customerData),
  updateCustomer: (id: number, customerData: any) => api.put(`/api/customers/${id}`, customerData),
  deleteCustomer: (id: number) => api.delete(`/api/customers/${id}`),
  importFromExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/customers/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Resource API
export const resourceAPI = {
  getResources: (customerId?: number, includeCustomer?: boolean) => {
    const params = new URLSearchParams();
    if (customerId) {
      params.append('customer_id', customerId.toString());
    }
    if (includeCustomer) {
      params.append('include_customer', 'true');
    }
    const queryString = params.toString();
    return api.get(`/api/resources${queryString ? `?${queryString}` : ''}`);
  },
  getResourceById: (id: number) => api.get(`/api/resources/${id}`),
  createResource: (resourceData: any) => api.post('/api/resources', resourceData),
  updateResource: (id: number, resourceData: any) => api.put(`/api/resources/${id}`, resourceData),
  deleteResource: (id: number) => api.delete(`/api/resources/${id}`),
};

// Service Report API
export const serviceReportAPI = {
  getServiceReports: () => {
    return api.get('/api/service-reports/', {
      params: {
        per_page: 1000 // 충분히 큰 수로 설정하여 모든 데이터 가져오기
      }
    });
  },
  getServiceReportById: (id: number) => {
    console.log(`API: 서비스 리포트 조회 시작, ID: ${id}`);
    return api.get(`/api/service-reports/${id}`);
  },
  createServiceReport: (reportData: any) => {
    console.log('API: 서비스 리포트 생성 시작');
    console.log('API: 생성 데이터:', reportData);
    return api.post('/api/service-reports/', reportData);
  },
  updateServiceReport: (id: number, reportData: any) => {
    console.log(`API: 서비스 리포트 수정 시작, ID: ${id}`);
    console.log('API: 수정 데이터:', reportData);
    return api.put(`/api/service-reports/${id}`, reportData);
  },
  deleteServiceReport: (id: number) => {
    console.log(`API: 서비스 리포트 삭제 시작, ID: ${id}`);
    return api.delete(`/api/service-reports/${id}`);
  },
  lockServiceReport: (id: number) => {
    console.log(`API: 서비스 리포트 잠금, ID: ${id}`);
    return api.post(`/api/service-reports/${id}/lock`);
  },
  unlockServiceReport: (id: number) => {
    console.log(`API: 서비스 리포트 잠금 해제, ID: ${id}`);
    return api.post(`/api/service-reports/${id}/unlock`);
  },
};

// Spare Parts API
export const sparePartsAPI = {
  getSpareParts: () => api.get('/api/spare-parts'),
  getSparePartById: (id: number) => api.get(`/api/spare-parts/${id}`),
  createSparePart: (partData: any) => api.post('/api/spare-parts', partData),
  updateSparePart: (id: number, partData: any) => api.put(`/api/spare-parts/${id}`, partData),
  deleteSparePart: (id: number) => api.delete(`/api/spare-parts/${id}`),
  
  // 서비스 리포트용 부품 검색
  searchPartByNumber: (partNumber: string) => 
    api.post('/api/spare-parts/service-search', { part_number: partNumber }),
  
  // 서비스 리포트 저장 시 부품 처리
  processServiceParts: (data: {
    service_report_id: number;
    customer_name: string;
    used_parts: Array<{
      part_number?: string;
      part_name: string;
      quantity: number;
      unit_price: number;
    }>;
  }) => api.post('/api/spare-parts/process-service-parts', data),

  // 거래명세서 저장 시 부품 처리
  processInvoiceParts: (data: {
    invoice_id: number;
    customer_name: string;
    used_parts: Array<{
      part_number?: string;
      part_name: string;
      quantity: number;
      unit_price: number;
    }>;
  }) => api.post('/api/spare-parts/process-invoice-parts', data),

  // 입출고 내역 삭제
  deleteStockHistory: (historyId: number) =>
    api.delete(`/api/spare-parts/history/${historyId}`),
};

// Invoice API
export const invoiceAPI = {
  getInvoices: (params?: { page?: number; per_page?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    return api.get(`/api/invoices${queryString ? `?${queryString}` : ''}`);
  },
  getInvoiceById: (id: number) => api.get(`/api/invoices/${id}`),
  createInvoice: (invoiceData: any) => {
    console.log('API: 거래명세서 생성 시작');
    console.log('API: 생성 데이터:', invoiceData);
    return api.post('/api/invoices', invoiceData);
  },
  updateInvoice: (id: number, invoiceData: any) => api.put(`/api/invoices/${id}`, invoiceData),
  deleteInvoice: (id: number) => api.delete(`/api/invoices/${id}`),
  generateExcel: (id: number) => api.post(`/api/invoices/${id}/generate-excel`),
  getYTDSummary: (year: number) => api.get(`/api/invoices/ytd-summary?year=${year}`),
};

// Transaction API
export const transactionAPI = {
  getTransactions: () => api.get('/api/transactions'),
  getTransactionById: (id: number) => api.get(`/api/transactions/${id}`),
  createTransaction: (transactionData: any) => api.post('/api/transactions', transactionData),
  updateTransaction: (id: number, transactionData: any) => api.put(`/api/transactions/${id}`, transactionData),
  deleteTransaction: (id: number) => api.delete(`/api/transactions/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getMonthlySummary: (year: number) => api.get(`/api/spare-parts/inventory/monthly-summary?year=${year}`),
  exportMonthlySummary: (year: number) => {
    return api.get(`/api/spare-parts/inventory/monthly-summary/export?year=${year}`, {
      responseType: 'blob'
    });
  }
};

export default api;