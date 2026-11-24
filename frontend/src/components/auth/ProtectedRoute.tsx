import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props { adminOnly?: boolean; }

export default function ProtectedRoute({ adminOnly = false }: Props) {
  const { user, token, isLoading } = useAuthStore();

  // Wait for fetchMe to finish before making any redirect decision
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!token || !user) return <Navigate to="/login" replace />;

  if (adminOnly && user.role !== 'admin' && user.role !== 'staff') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
