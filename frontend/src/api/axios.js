import axios from 'axios';

/**
 * Axios instance pre-configured for the CSTech API.
 *
 * All React components import axiosInstance from here instead of
 * importing raw axios. This guarantees:
 * 1. Every request hits the correct base URL (no copy-paste errors)
 * 2. Every request automatically carries the JWT header (no manual wiring per component)
 *
 * Design decision — localStorage key 'cstch_token' (namespaced):
 * Using a namespaced key prevents collision with other apps sharing the same
 * localhost origin during development. If two projects both stored 'token',
 * they'd overwrite each other — the namespace makes them independent.
 */
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
});

/**
 * Request interceptor — JWT injection
 * Runs before every outgoing request. Reads the token from localStorage and
 * sets the Authorization header. If no token exists (logged out / never logged in),
 * the header is simply not set — the server's verifyToken middleware will then
 * return 401, which React can handle by redirecting to /login.
 */
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('cstch_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;