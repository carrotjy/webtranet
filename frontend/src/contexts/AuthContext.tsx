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
  is_admin: boolean;
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
          // We'll need to implement a /me endpoint or get user from token
          const userDataString = localStorage.getItem('user');
          if (userDataString) {
            setUser(JSON.parse(userDataString));
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