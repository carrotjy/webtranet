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

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 로그인 요청 자체는 제외 (로그인 실패 시 리다이렉트하지 않음)
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
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
};

// Invoice API
export const invoiceAPI = {
  getInvoices: (params?: { page?: number; per_page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());

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
};

// Transaction API
export const transactionAPI = {
  getTransactions: () => api.get('/api/transactions'),
  getTransactionById: (id: number) => api.get(`/api/transactions/${id}`),
  createTransaction: (transactionData: any) => api.post('/api/transactions', transactionData),
  updateTransaction: (id: number, transactionData: any) => api.put(`/api/transactions/${id}`, transactionData),
  deleteTransaction: (id: number) => api.delete(`/api/transactions/${id}`),
};

export default api;