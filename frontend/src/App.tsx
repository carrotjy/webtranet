import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import {
  Login,
  Dashboard,
  ServiceReports,
  Customers,
  ResourceManagement,
  SpareParts,
  UserManagement,
  ServiceReportSettings,
  InvoiceSettings,
  SparePartSettings,
  Invoices,
  InvoiceForm,
  InvoiceView,
  MonthlyInventoryPage,
  YTDSummaryPage
} from './pages';
import ResourceSettings from './pages/ResourceSettings';
import SystemSettings from './pages/SystemSettings';
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
              <Route path="customers" element={
                <ProtectedRoute requiredPermission="customer">
                  <Customers />
                </ProtectedRoute>
              } />
              <Route path="resource-management" element={
                <ProtectedRoute requiredPermission="resource">
                  <ResourceManagement />
                </ProtectedRoute>
              } />
              <Route path="spare-parts" element={
                <ProtectedRoute requiredPermission="spare_parts">
                  <SpareParts />
                </ProtectedRoute>
              } />
              <Route path="invoices" element={
                <ProtectedRoute requiredPermission="transaction">
                  <Invoices />
                </ProtectedRoute>
              } />
              <Route path="invoices/:invoiceId" element={
                <ProtectedRoute requiredPermission="transaction">
                  <InvoiceView />
                </ProtectedRoute>
              } />
              <Route path="invoices/new" element={
                <ProtectedRoute requiredPermission="transaction">
                  <InvoiceForm />
                </ProtectedRoute>
              } />
              <Route path="invoices/:invoiceId/edit" element={
                <ProtectedRoute requiredPermission="transaction">
                  <InvoiceForm />
                </ProtectedRoute>
              } />
              <Route path="invoices/from-service-report/:serviceReportId" element={
                <ProtectedRoute requiredPermission="transaction">
                  <InvoiceForm />
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
              <Route path="admin/resource-settings" element={
                <ProtectedRoute adminOnly>
                  <ResourceSettings />
                </ProtectedRoute>
              } />
              <Route path="admin/invoices" element={
                <ProtectedRoute adminOnly>
                  <InvoiceSettings />
                </ProtectedRoute>
              } />
              <Route path="admin/spare-parts" element={
                <ProtectedRoute adminOnly>
                  <SparePartSettings />
                </ProtectedRoute>
              } />
              <Route path="admin/system-settings" element={
                <ProtectedRoute adminOnly>
                  <SystemSettings />
                </ProtectedRoute>
              } />
              <Route path="monthly-inventory" element={
                <ProtectedRoute requiredPermission="spare_parts">
                  <MonthlyInventoryPage />
                </ProtectedRoute>
              } />
              <Route path="ytd-summary" element={<YTDSummaryPage />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
