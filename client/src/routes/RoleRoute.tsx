import { Navigate, Outlet } from 'react-router-dom';
import { useUserRole } from '@/stores/authStore';
import type { Role } from '@/types';

interface RoleRouteProps {
  roles: Role[];
  redirectTo?: string;
}

export default function RoleRoute({ roles, redirectTo = '/' }: RoleRouteProps) {
  const role = useUserRole();

  if (!role || !roles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
