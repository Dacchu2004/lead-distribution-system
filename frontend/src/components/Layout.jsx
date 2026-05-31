import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

/**
 * Maps route paths to readable page titles shown in the top bar.
 * This avoids parsing location.pathname manually in multiple places.
 */
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/agents': 'Agents',
  '/lists': 'Lists',
};

/**
 * Layout
 * The persistent visual shell for all protected pages.
 *
 * Structure:
 * ┌──────────────────────────────────────────────────────┐
 * │  Sidebar (fixed, w-60)  │  Top bar (sticky)          │
 * │                         │────────────────────────────│
 * │                         │  <Outlet /> (page content) │
 * │                         │                            │
 * └──────────────────────────────────────────────────────┘
 *
 * ml-60 offsets the content area by exactly the sidebar width so nothing
 * sits underneath the sidebar. The top bar uses sticky + backdrop-blur
 * so it stays visible while scrolling long page content.
 */
export default function Layout() {
  const { admin } = useAuth();
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';
  const adminInitial = admin?.email?.[0]?.toUpperCase() || 'A';

  return (
    <div className="min-h-screen bg-dark-800 flex">
      <Sidebar />

      {/* ─── Main area — offset left by sidebar width ─────────────────── */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen">

        {/* ─── Top bar ───────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-dark-700/80 backdrop-blur-md border-b border-dark-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-base font-sans">{pageTitle}</h1>
          </div>

          {/* Admin badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-xs font-bold font-mono">{adminInitial}</span>
            </div>
            <span className="text-slate-400 text-sm font-sans hidden sm:block">
              {admin?.email || 'Admin'}
            </span>
          </div>
        </header>

        {/* ─── Page content ──────────────────────────────────────────── */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}