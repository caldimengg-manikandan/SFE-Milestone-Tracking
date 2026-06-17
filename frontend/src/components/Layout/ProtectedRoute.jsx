import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, moduleKey, adminOnly }) {
  const userStr = sessionStorage.getItem('user');
  const location = useLocation();

  if (!userStr) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = JSON.parse(userStr);
  const isAdmin = user.role === 'admin';

  if (adminOnly && !isAdmin) {
    // If not admin, redirect to their first allowed module or dashboard
    const firstAllowed = user.allowed_modules?.[0];
    const fallback = firstAllowed ? (firstAllowed.startsWith('/') ? firstAllowed : `/${firstAllowed}`) : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  if (moduleKey && !isAdmin) {
    const allowedModules = user.allowed_modules || [];
    const keysToCheck = moduleKey.split(',');
    const hasAccess = keysToCheck.some(k => allowedModules.includes(k.trim()));
    if (!hasAccess) {
      // Redirect to the first allowed module
      const firstAllowed = allowedModules[0];
      if (firstAllowed) {
        const redirectPath = firstAllowed.startsWith('/') ? firstAllowed : `/${firstAllowed}`;
        return <Navigate to={redirectPath} replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
