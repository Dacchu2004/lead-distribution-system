import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileSpreadsheet, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * navItems — single source of truth for all sidebar links.
 * Adding a new protected page = one entry here + one <Route> in App.jsx.
 */
const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Users },
  { to: '/lists', label: 'Lists', icon: FileSpreadsheet },
];

/**
 * Sidebar
 * Fixed-position left panel (w-60 = 240px), full viewport height.
 *
 * NavLink provides an `isActive` boolean via its className callback —
 * we use this to apply accent styling to the currently active route without
 * any manual location.pathname comparisons.
 *
 * Logout clears auth state + shows a toast confirmation, then navigates
 * to /login. The navigate call is necessary because AuthContext.logout()
 * only clears state — it doesn't trigger a route change.
 */
export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-dark-700 border-r border-dark-500 flex flex-col z-40">

      {/* ─── Brand ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-dark-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-glow flex-shrink-0">
            <Shield size={17} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight font-sans tracking-wide">
              CSTech
            </p>
            <p className="text-slate-500 text-xs font-sans">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* ─── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-600 text-xs font-sans uppercase tracking-widest px-3 mb-2">
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-sans',
                'transition-all duration-150',
                isActive
                  ? 'bg-accent text-white shadow-glow'
                  : 'text-slate-400 hover:text-white hover:bg-dark-500',
              ].join(' ')
            }
          >
            <Icon size={17} strokeWidth={isActive => (isActive ? 2.5 : 2)} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ─── Logout ────────────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t border-dark-500">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-sans text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}