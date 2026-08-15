import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Sparkles, ArrowRight, RefreshCw, Mail, Home } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../App';
import Cosmic3DBackground from '../components/Cosmic3DBackground';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Verification link is missing or invalid.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await axios.post('/api/auth/verify-email', { token });
        setStatus('success');
        if (res.data.access_token && res.data.user) {
          login(res.data.access_token, res.data.user);
          setTimeout(() => {
            navigate('/dashboard');
          }, 2500);
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.detail || 'This verification link is invalid or has expired. Please request a new one.');
      }
    };

    verifyToken();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setResending(true);
    setErrorMsg('');
    setResendMsg('');

    try {
      const res = await axios.post('/api/auth/resend-verification', { email: resendEmail.trim().toLowerCase() });
      setResendMsg(res.data.message || 'A fresh verification link has been sent to your email.');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#03070d]">
      <Cosmic3DBackground particleCount={500} opacity={0.45} speed={0.05} />

      <div className="relative w-full max-w-md glass-authkit p-8 sm:p-10 rounded-3xl z-10 text-center">
        {/* State 1: Verifying */}
        {status === 'verifying' && (
          <div className="space-y-4 py-6">
            <div className="w-14 h-14 rounded-full border-2 border-[#b8f032]/20 border-t-[#b8f032] animate-spin mx-auto"></div>
            <h2 className="text-xl font-extrabold text-white">Verifying Your Email...</h2>
            <p className="text-xs text-gray-400">Cryptographically authenticating your verification token.</p>
          </div>
        )}

        {/* State 2: Success */}
        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-3xl bg-[#b8f032]/20 border border-[#b8f032]/40 flex items-center justify-center mx-auto text-[#b8f032] shadow-[0_0_30px_rgba(184,240,50,0.4)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b8f032]/10 border border-[#b8f032]/30 text-[#b8f032] text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Account Activated
            </div>
            <h2 className="text-2xl font-black text-white">Email Verified Successfully!</h2>
            <p className="text-xs text-gray-300">
              Welcome to Clip Cutter AI. Your account is fully active with free credits. Redirecting to dashboard...
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-pill-white w-full py-3 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Go to Dashboard Now
              </button>
            </div>
          </motion.div>
        )}

        {/* State 3: Error */}
        {status === 'error' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 py-2">
            <div className="w-16 h-16 rounded-3xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-white">Verification Link Expired</h2>
            <p className="text-xs text-gray-300">{errorMsg}</p>

            {resendMsg ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 font-semibold">
                {resendMsg}
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Enter your email to get a new link:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#b8f032]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resending}
                  className="btn-pill-white w-full py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-center">
              <Link to="/login" className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <Home className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
