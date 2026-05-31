import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

/**
 * AuthProvider
 * Wraps the entire app and exposes auth state to every component
 * via the useAuth() hook — no prop-drilling needed.
 *
 * Design decision — `loading` state during mount:
 * On first render we don't know if the user is authenticated yet —
 * localStorage hasn't been read. Without a loading flag, PrivateRoute
 * sees isAuthenticated=false and immediately redirects to /login,
 * even for sessions that are perfectly valid. The loading flag holds
 * PrivateRoute in a neutral spinner state until the localStorage check
 * completes (synchronously, in microseconds), then renders the correct view.
 * This eliminates the "flash to /login" bug for returning authenticated users.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true); // true until localStorage is read

  // Read persisted session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('cstch_token');
    const storedAdmin = localStorage.getItem('cstch_admin');

    if (storedToken && storedAdmin) {
      try {
        setToken(storedToken);
        setAdmin(JSON.parse(storedAdmin));
      } catch {
        // Corrupted JSON in localStorage — clear it so the user can log in fresh
        localStorage.removeItem('cstch_token');
        localStorage.removeItem('cstch_admin');
      }
    }

    setLoading(false); // Auth check done — PrivateRoute can now render correctly
  }, []);

  /**
   * login
   * Called after a successful POST /api/auth/login response.
   * Persists both token and admin data so the session survives page refresh.
   *
   * @param {string} newToken - The JWT from the backend
   * @param {object} adminData - { email: 'admin@cstch.com' }
   */
  const login = (newToken, adminData) => {
    localStorage.setItem('cstch_token', newToken);
    localStorage.setItem('cstch_admin', JSON.stringify(adminData));
    setToken(newToken);
    setAdmin(adminData);
  };

  /**
   * logout
   * Clears all auth data from both state and localStorage.
   * After this, isAuthenticated becomes false and PrivateRoute redirects to /login.
   */
  const logout = () => {
    localStorage.removeItem('cstch_token');
    localStorage.removeItem('cstch_admin');
    setToken(null);
    setAdmin(null);
  };

  const value = {
    token,
    admin,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth
 * Custom hook to consume auth context in any component.
 * Throws a descriptive error if accidentally used outside AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}