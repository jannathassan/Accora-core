import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/app/DashboardPage';
import TransactionsPage from './pages/app/TransactionsPage';
import InvoicesPage from './pages/app/InvoicesPage';
import AnalyticsPage from './pages/app/AnalyticsPage';
import IntelligencePage from './pages/app/IntelligencePage';
import ForecastPage from './pages/app/ForecastPage';
import ScenariosPage from './pages/app/ScenariosPage';
import ReportsPage from './pages/app/ReportsPage';
import NotificationsPage from './pages/app/NotificationsPage';
import SettingsPage from './pages/app/SettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Workspace Application Shell (Protected) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="intelligence" element={<IntelligencePage />} />
                <Route path="forecast" element={<ForecastPage />} />
                <Route path="scenarios" element={<ScenariosPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Fallback to Landing Page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
