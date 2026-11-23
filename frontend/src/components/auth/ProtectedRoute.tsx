import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props { adminOnly?: boolean; }

export default function ProtectedRoute({ adminOnly = false }: Props) {
  const { user, token } = useAuthStore();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin' && user.role !== 'staff') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
