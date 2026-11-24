import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props { adminOnly?: boolean; }

export default function ProtectedRoute({ adminOnly = false }: Props) {
  const { user, token, isLoading } = useAuthStore();

  // Still fetching user from server — don't redirect yet
  if (token && isLoading) return null;

  if (!token || !user) return <Navigate to="/login" replace />;

  if (adminOnly && user.role !== 'admin' && user.role !== 'staff') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
