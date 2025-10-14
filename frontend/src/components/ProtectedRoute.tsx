import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission, 
  adminOnly = false 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.is_admin) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">접근 권한이 없습니다</h4>
          <p>이 페이지에 접근하려면 관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  if (requiredPermission) {
    const hasPermission = user.is_admin || (() => {
      switch (requiredPermission) {
        case 'service_report':
          return user.service_report_access;
        case 'transaction':
          return user.transaction_access;
        case 'customer':
          return user.customer_access;
        case 'spare_parts':
          return user.spare_parts_access;
        case 'resource':
          return user.resource_access;
        default:
          return false;
      }
    })();

    if (!hasPermission) {
      return (
        <div className="container mt-5">
          <div className="alert alert-warning" role="alert">
            <h4 className="alert-heading">접근 권한이 없습니다</h4>
            <p>이 페이지에 접근할 권한이 없습니다. 관리자에게 문의하세요.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;