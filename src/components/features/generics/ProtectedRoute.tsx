import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../hooks/auth/useAuth.ts';
import LoadingIndicator from '../../ui/LoadingIndicator.tsx';

interface ProtectedRouteProps {
  requiresAuth?: boolean;
  requiresProfileComplete?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiresAuth = false,
  requiresProfileComplete = false,
}) => {
  const { user, isProfileComplete, loading } = useAuth();

  if (loading) {
    return <LoadingIndicator />;
  }

  if (requiresAuth && !user) {
    return <Navigate to="/" replace />;
  }

  if (requiresProfileComplete && user && !isProfileComplete) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
