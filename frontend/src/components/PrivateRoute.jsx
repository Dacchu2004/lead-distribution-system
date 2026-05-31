import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PrivateRoute
 * A route wrapper that enforces authentication before rendering any child page.
 *
 * Three possible states:
 *
 * 1. loading=true → Still reading localStorage on initial mount.
 *    Show a centered spinner to prevent any flash-redirect to /login.
 *
 * 2. !isAuthenticated → No valid session found.
 *    Redirect to /login with `replace` so the browser history doesn't
 *    record the protected URL — pressing Back won't loop the user.
 *
 * 3. isAuthenticated → Valid session confirmed.
 *    Render <Outlet /> — whichever nested route is currently active
 *    (Dashboard, Agents, or Lists) will render inside Layout.
 */
export default function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-sans tracking-wide">
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}