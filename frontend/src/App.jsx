import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Dynamic API URL for Vercel / Netlify / Localhost
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// ── Global Auth Interceptor: auto-attach JWT token to every request ──
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Global 401 Interceptor: auto-logout on expired/invalid sessions ──
// NOTE: We track whether the app has performed an explicit login to avoid
// redirecting during the initial /me check (which can legitimately 401
// on a stale token).
let _appDidLogin = false;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only force-redirect on 401 if user was previously authenticated
    if (error.response?.status === 401 && _appDidLogin && localStorage.getItem('token')) {
      console.warn('[Auth] Session expired — auto-logout triggered');
      localStorage.removeItem('token');
      _appDidLogin = false;
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Pages & Components
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import ClipEditor from './components/ClipEditor';
import AutoCaptionStudio from './pages/AutoCaptionStudio';
import VerifyEmail from './pages/VerifyEmail';

// ── Auth State: Deterministic 3-State Enum ──────────────────────────
// 'loading'         → Checking stored token / fetching /me
// 'authenticated'   → Valid user + token confirmed
// 'unauthenticated' → No token or token invalid
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const ProtectedRoute = ({ children }) => {
  const { authStatus, user } = useAuth();

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030604] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#b8f032]/20 border-t-[#b8f032] rounded-full animate-spin"></div>
          <span className="text-[#b8f032] font-semibold text-xs tracking-widest uppercase">Loading Clip Cutter...</span>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const didInitRef = useRef(false);
  const location = useLocation();

  // ── Initial auth check (runs ONCE on mount) ──────────────────────
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setAuthStatus('unauthenticated');
        return;
      }

      try {
        const res = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setUser(res.data);
        setToken(storedToken);
        setAuthStatus('authenticated');
        _appDidLogin = true;
      } catch (err) {
        console.error('[Auth] Stored token invalid or expired:', err?.response?.status || err.message);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    };

    initAuth();
  }, []);

  // ── Login: Called by Login.jsx after successful API response ──────
  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setAuthStatus('authenticated');
    _appDidLogin = true;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAuthStatus('unauthenticated');
    _appDidLogin = false;
  }, []);

  // ── Refresh user profile (for credit updates, etc.) ───────────────
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return;

    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error('[Auth] Failed to refresh user profile:', err?.response?.status || err.message);
      // Don't logout on refresh failure — could be a transient network error
    }
  }, []);

  // ── Backward-compatible `loading` property ────────────────────────
  const loading = authStatus === 'loading';

  const authValue = {
    user,
    token,
    login,
    logout,
    refreshUser,
    loading,
    authStatus,
    isAdmin: user?.is_admin === true || user?.plan === 'ADMIN'
  };

  return (
    <AuthContext.Provider value={authValue}>
      <div className="min-h-screen bg-[#030604] text-white relative flex flex-col selection:bg-[#b8f032] selection:text-black overflow-x-hidden">
        {/* Static Verdant Ambient Glow Orbs (Zero CPU / 0 Lag) */}
        <div className="fixed top-[-10%] left-[20%] w-[550px] h-[550px] bg-[#22c55e]/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>
        <div className="fixed top-[30%] right-[10%] w-[450px] h-[450px] bg-[#b8f032]/8 rounded-full blur-[140px] pointer-events-none -z-10"></div>
        <div className="fixed bottom-[-10%] left-[10%] w-[500px] h-[500px] bg-[#14532d]/15 rounded-full blur-[160px] pointer-events-none -z-10"></div>

        {authStatus === 'authenticated' && user && <Navbar />}

        <main className={`flex-1 ${authStatus === 'authenticated' && user ? "pt-24 pb-16" : ""}`}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to={authStatus === 'authenticated' ? "/dashboard" : "/login"} replace />} />
              <Route path="/login" element={authStatus !== 'authenticated' ? <Login /> : <Navigate to="/dashboard" replace />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/caption-editor" element={<ProtectedRoute><AutoCaptionStudio /></ProtectedRoute>} />
              <Route path="/project/:id" element={<ProtectedRoute><ClipEditor /></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
