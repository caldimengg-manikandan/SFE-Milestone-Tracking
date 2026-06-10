import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const user = sessionStorage.getItem('user');
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
