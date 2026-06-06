import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useIsAuthenticated, useCurrentUser } from '@/stores/authStore';

export default function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  if (user?.must_change_password && location.pathname !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />;
  }

  return <Outlet />;
}
