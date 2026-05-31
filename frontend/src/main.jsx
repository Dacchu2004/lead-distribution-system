import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

/**
 * Render order matters:
 * BrowserRouter → must wrap everything that uses React Router hooks
 * AuthProvider  → must wrap everything that uses useAuth()
 * App           → contains all <Routes> and page components
 * Toaster       → single global instance for toast notifications
 *                 (position top-right, styled to match dark theme via toastOptions)
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#141c35',
              color: '#e2e8f0',
              border: '1px solid #1a2444',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '14px',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#141c35' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#141c35' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);