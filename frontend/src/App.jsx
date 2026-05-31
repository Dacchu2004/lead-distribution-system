import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Lists from './pages/Lists';

/**
 * App — Route Tree
 *
 * Structure explained:
 *
 * /login
 *   → Public. Renders Login page directly, no auth check.
 *
 * /
 *   → Redirects to /dashboard (convenience — bare domain goes to dashboard).
 *
 * <PrivateRoute> (no path — acts as an auth wrapper for its children)
 *   → Checks isAuthenticated. If false, redirects to /login.
 *   → If true, renders <Outlet /> which resolves to...
 *
 * <Layout> (no path — acts as the visual shell for protected pages)
 *   → Renders Sidebar + TopBar + <Outlet />
 *   → <Outlet /> resolves to whichever route below matches:
 *
 *       /dashboard → <Dashboard />
 *       /agents    → <Agents />
 *       /lists     → <Lists />
 *
 * * (catch-all) → Redirects to /dashboard for any unknown URL.
 *
 * This two-level nesting (PrivateRoute → Layout → page) cleanly separates
 * auth logic from layout logic. Adding a new protected page is one <Route> line.
 */
export default function App() {
  return (
    <Routes>
      {/* Public route — login page, no auth guard */}
      <Route path="/login" element={<Login />} />

      {/* Root → dashboard redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected routes — guarded by PrivateRoute, framed by Layout */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/lists" element={<Lists />} />
        </Route>
      </Route>

      {/* Catch-all — unknown URLs fall back to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}