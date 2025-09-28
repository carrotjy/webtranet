import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

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
    if (error.response?.status === 401) {
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
    return api.post('/auth/login', { 
      email: credentials.username, 
      password: credentials.password 
    });
  },
  
  logout: () => api.post('/auth/logout'),
  
  getCurrentUser: () => api.get('/auth/me'),
  
  register: (userData: { 
    username: string; 
    password: string; 
    email: string; 
    role: string; 
    permissions: string[]; 
  }) => api.post('/auth/register', userData),
};

// User Management API
export const userAPI = {
  getUsers: () => api.get('/users'),
  getUserById: (id: number) => api.get(`/users/${id}`),
  getTechnicians: () => api.get('/users/technicians'),
  createUser: (userData: any) => api.post('/users', userData),
  updateUser: (id: number, userData: any) => api.put(`/users/${id}`, userData),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
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
    return api.get(`/customers/${queryString ? `?${queryString}` : ''}`);
  },
  getCustomerById: (id: number) => api.get(`/customers/${id}`),
  createCustomer: (customerData: any) => api.post('/customers/', customerData),
  updateCustomer: (id: number, customerData: any) => api.put(`/customers/${id}`, customerData),
  deleteCustomer: (id: number) => api.delete(`/customers/${id}`),
  importFromExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/customers/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Resource API
export const resourceAPI = {
  getResources: (customerId?: number) => {
    const params = customerId ? `?customer_id=${customerId}` : '';
    return api.get(`/resources${params}`);
  },
  getResourceById: (id: number) => api.get(`/resources/${id}`),
  createResource: (resourceData: any) => api.post('/resources', resourceData),
  updateResource: (id: number, resourceData: any) => api.put(`/resources/${id}`, resourceData),
  deleteResource: (id: number) => api.delete(`/resources/${id}`),
};

// Service Report API
export const serviceReportAPI = {
  getServiceReports: () => {
    console.log('API: 서비스 리포트 목록 조회 시작');
    return api.get('/service-reports/');
  },
  getServiceReportById: (id: number) => {
    console.log(`API: 서비스 리포트 조회 시작, ID: ${id}`);
    return api.get(`/service-reports/${id}`);
  },
  createServiceReport: (reportData: any) => {
    console.log('API: 서비스 리포트 생성 시작');
    console.log('API: 생성 데이터:', reportData);
    return api.post('/service-reports/', reportData);
  },
  updateServiceReport: (id: number, reportData: any) => {
    console.log(`API: 서비스 리포트 수정 시작, ID: ${id}`);
    console.log('API: 수정 데이터:', reportData);
    return api.put(`/service-reports/${id}`, reportData);
  },
  deleteServiceReport: (id: number) => {
    console.log(`API: 서비스 리포트 삭제 시작, ID: ${id}`);
    return api.delete(`/service-reports/${id}`);
  },
};

// Spare Parts API
export const sparePartsAPI = {
  getSpareParts: () => api.get('/spare-parts'),
  getSparePartById: (id: number) => api.get(`/spare-parts/${id}`),
  createSparePart: (partData: any) => api.post('/spare-parts', partData),
  updateSparePart: (id: number, partData: any) => api.put(`/spare-parts/${id}`, partData),
  deleteSparePart: (id: number) => api.delete(`/spare-parts/${id}`),
};

// Transaction API
export const transactionAPI = {
  getTransactions: () => api.get('/transactions'),
  getTransactionById: (id: number) => api.get(`/transactions/${id}`),
  createTransaction: (transactionData: any) => api.post('/transactions', transactionData),
  updateTransaction: (id: number, transactionData: any) => api.put(`/transactions/${id}`, transactionData),
  deleteTransaction: (id: number) => api.delete(`/transactions/${id}`),
};

export default api;