import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { 
  Login, 
  Dashboard, 
  ServiceReports, 
  Transactions, 
  Customers, 
  SpareParts, 
  UserManagement,
  ServiceReportSettings,
  TransactionSettings,
  SparePartSettings
} from './pages';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="service-reports" element={
                <ProtectedRoute requiredPermission="service_report">
                  <ServiceReports />
                </ProtectedRoute>
              } />
              <Route path="transactions" element={
                <ProtectedRoute requiredPermission="transaction">
                  <Transactions />
                </ProtectedRoute>
              } />
              <Route path="customers" element={
                <ProtectedRoute requiredPermission="customer">
                  <Customers />
                </ProtectedRoute>
              } />
              <Route path="spare-parts" element={
                <ProtectedRoute requiredPermission="spare_parts">
                  <SpareParts />
                </ProtectedRoute>
              } />
              <Route path="user-management" element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="admin/service-reports" element={
                <ProtectedRoute adminOnly>
                  <ServiceReportSettings />
                </ProtectedRoute>
              } />
              <Route path="admin/transactions" element={
                <ProtectedRoute adminOnly>
                  <TransactionSettings />
                </ProtectedRoute>
              } />
              <Route path="admin/spare-parts" element={
                <ProtectedRoute adminOnly>
                  <SparePartSettings />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
