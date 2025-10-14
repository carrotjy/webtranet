import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authAPI } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  contact?: string;
  department?: string;
  service_report_access: boolean;
  transaction_access: boolean;
  customer_access: boolean;
  spare_parts_access: boolean;
  resource_access: boolean;  // 리소스 접근 권한 추가
  spare_parts_edit: boolean;
  spare_parts_delete: boolean;
  spare_parts_stock_in: boolean;
  spare_parts_stock_out: boolean;
  is_admin: boolean;
  // 서비스 리포트 CRUD 권한
  service_report_create?: boolean;
  service_report_read?: boolean;
  service_report_update?: boolean;
  service_report_delete?: boolean;
  // 리소스 CRUD 권한
  resource_create?: boolean;
  resource_read?: boolean;
  resource_update?: boolean;
  resource_delete?: boolean;
  // 고객정보 CRUD 권한
  customer_create?: boolean;
  customer_read?: boolean;
  customer_update?: boolean;
  customer_delete?: boolean;
  // 거래명세서 CRUD 권한
  transaction_create?: boolean;
  transaction_read?: boolean;
  transaction_update?: boolean;
  transaction_delete?: boolean;
  // 부품 CRUD 권한
  spare_parts_create?: boolean;
  spare_parts_read?: boolean;
  spare_parts_update?: boolean;
  spare_parts_delete_crud?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // 토큰이 있으면 사용자 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          // API로부터 최신 사용자 정보 가져오기
          const response = await fetch('http://localhost:5000/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            // 토큰이 유효하지 않으면 로컬스토리지에서 가져오기 시도
            const userDataString = localStorage.getItem('user');
            if (userDataString) {
              setUser(JSON.parse(userDataString));
            } else {
              throw new Error('Invalid token');
            }
          }
        } catch (error) {
          console.error('사용자 정보 조회 실패:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ 
        username: email, // API service expects username field, map email to it
        password 
      });

      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '로그인에 실패했습니다.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.is_admin) return true;

    switch (permission) {
      case 'service_report_access':
        return user.service_report_access;
      case 'transaction_access':
        return user.transaction_access;
      case 'customer_access':
        return user.customer_access;
      case 'spare_parts_access':
        return user.spare_parts_access;
      case 'resource_access':
        return user.resource_access;
      
      // 서비스 리포트 CRUD 권한
      case 'service_report_create':
        return user.service_report_create || false;
      case 'service_report_read':
        return user.service_report_read || false;
      case 'service_report_update':
        return user.service_report_update || false;
      case 'service_report_delete':
        return user.service_report_delete || false;
      
      // 리소스 CRUD 권한
      case 'resource_create':
        return user.resource_create || false;
      case 'resource_read':
        return user.resource_read || false;
      case 'resource_update':
        return user.resource_update || false;
      case 'resource_delete':
        return user.resource_delete || false;
      
      // 고객정보 CRUD 권한
      case 'customer_create':
        return user.customer_create || false;
      case 'customer_read':
        return user.customer_read || false;
      case 'customer_update':
        return user.customer_update || false;
      case 'customer_delete':
        return user.customer_delete || false;
      
      // 거래명세서 CRUD 권한
      case 'transaction_create':
        return user.transaction_create || false;
      case 'transaction_read':
        return user.transaction_read || false;
      case 'transaction_update':
        return user.transaction_update || false;
      case 'transaction_delete':
        return user.transaction_delete || false;
      
      // 부품 CRUD 권한
      case 'spare_parts_create':
        return user.spare_parts_create || false;
      case 'spare_parts_read':
        return user.spare_parts_read || false;
      case 'spare_parts_update':
        return user.spare_parts_update || false;
      case 'spare_parts_delete_crud':
        return user.spare_parts_delete_crud || false;
      
      // 스페어파트 세부 권한 (기존)
      case 'spare_parts_edit':
        return user.spare_parts_edit || false;
      case 'spare_parts_delete':
        return user.spare_parts_delete || false;
      case 'spare_parts_stock_in':
        return user.spare_parts_stock_in || false;
      case 'spare_parts_stock_out':
        return user.spare_parts_stock_out || false;
      
      default:
        return false;
    }
  };

  const isAdmin = (): boolean => {
    return user?.is_admin || false;
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    loading,
    hasPermission,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};