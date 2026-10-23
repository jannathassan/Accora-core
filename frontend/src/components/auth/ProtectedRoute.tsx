import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const hasStoredToken = typeof window !== 'undefined' && !!localStorage.getItem('accora_token');

  if (isLoading || (!isAuthenticated && hasStoredToken)) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-[var(--text-secondary)] font-medium">Validating workspace session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login while preserving destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
