import React, { createContext, useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Dynamic API URL for Vercel / Netlify / Localhost
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Pages & Components
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import ClipEditor from './components/ClipEditor';
import AutoCaptionStudio from './pages/AutoCaptionStudio';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030604] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#b8f032]/20 border-t-[#b8f032] rounded-full animate-spin"></div>
          <span className="text-[#b8f032] font-semibold text-xs tracking-widest uppercase">Loading Clip Cutter...</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch (err) {
          console.error("Auth session expired", err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err) {
        console.error("Failed to refresh user profile", err);
      }
    }
  };

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const authValue = {
    user,
    token,
    login,
    logout,
    refreshUser,
    loading,
    isAdmin: user?.is_admin === true || user?.plan === 'ADMIN'
  };

  return (
    <AuthContext.Provider value={authValue}>
      <div className="min-h-screen bg-[#030604] text-white relative flex flex-col selection:bg-[#b8f032] selection:text-black overflow-x-hidden">
        {/* Static Verdant Ambient Glow Orbs (Zero CPU / 0 Lag) */}
        <div className="fixed top-[-10%] left-[20%] w-[550px] h-[550px] bg-[#22c55e]/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>
        <div className="fixed top-[30%] right-[10%] w-[450px] h-[450px] bg-[#b8f032]/8 rounded-full blur-[140px] pointer-events-none -z-10"></div>
        <div className="fixed bottom-[-10%] left-[10%] w-[500px] h-[500px] bg-[#14532d]/15 rounded-full blur-[160px] pointer-events-none -z-10"></div>

        {user && <Navbar />}

        <main className={`flex-1 ${user ? "pt-24 pb-16" : ""}`}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
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
