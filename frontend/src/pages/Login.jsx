import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, 
  AlertCircle, Sparkles, RefreshCw, Lock, Mail, Eye, EyeOff, User, KeyRound
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import Cosmic3DBackground from '../components/Cosmic3DBackground';

export default function Login() {
  // Primary Flow Mode: 'signin' | 'signup' | 'verify_otp'
  const [authMode, setAuthMode] = useState('signin');

  // Sign In / Sign Up Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification State
  const [targetEmail, setTargetEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  // UI / Feedback State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [unverifiedEmailFound, setUnverifiedEmailFound] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Live Resend Cooldown Timer ────────────────────────────────────
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // ── Switch Tabs Helper ────────────────────────────────────────────
  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccessMsg('');
    setUnverifiedEmailFound(false);
  };

  // ── 1. Sign In Handler ────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setUnverifiedEmailFound(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', cleanEmail);
      formData.append('password', password);

      const res = await axios.post('/api/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      login(res.data.access_token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Authentication failed. Please verify your credentials.';
      setError(detail);

      // Check if unverified
      if (detail.toLowerCase().includes('verify your email')) {
        setUnverifiedEmailFound(true);
        setTargetEmail(cleanEmail);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Create Account Handler ─────────────────────────────────────
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', {
        name: cleanName,
        email: cleanEmail,
        password: password
      });

      // Account created as unverified -> Transition to OTP screen
      setTargetEmail(cleanEmail);
      setAuthMode('verify_otp');
      setCooldown(res.data.cooldown_seconds || 60);
      setSuccessMsg(res.data.message || `A 6-digit verification code has been sent to ${cleanEmail}`);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Send/Resend Email OTP Handler ──────────────────────────────
  const handleSendOtpForVerification = async (target) => {
    const emailToUse = target || targetEmail || email.trim().toLowerCase();
    if (!emailToUse) return;

    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/send-email-otp', { email: emailToUse });
      setTargetEmail(emailToUse);
      setAuthMode('verify_otp');
      setCooldown(res.data.cooldown_seconds || 60);
      setSuccessMsg(`Verification code sent to ${emailToUse}`);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── 4. 6-Digit OTP Box Management ─────────────────────────────────
  const handleOtpBoxChange = (index, value) => {
    const val = value.replace(/\D/g, '');
    if (!val) {
      const updated = [...otpValues];
      updated[index] = '';
      setOtpValues(updated);
      return;
    }

    const updated = [...otpValues];
    // Handle pasting multiple digits (e.g. 123456)
    if (val.length > 1) {
      const digits = val.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        updated[i] = digits[i] || '';
      }
      setOtpValues(updated);
      const nextIndex = Math.min(digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    updated[index] = val.slice(-1);
    setOtpValues(updated);

    if (index < 5 && val) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── 5. Verify Email OTP Handler ───────────────────────────────────
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/verify-email-otp', {
        email: targetEmail,
        otp_code: otpCode
      });

      setSuccessMsg('Email verified successfully! Welcome to Clip_Cut.');
      login(res.data.access_token, res.data.user);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── 6. Google OAuth Success Handler ───────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/google', {
        credential: credentialResponse.credential
      });

      login(res.data.access_token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.response?.data?.detail || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In was cancelled or encountered an error.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#03070d]">
      
      {/* 3D Three.js Cosmic Starfield Background */}
      <Cosmic3DBackground particleCount={500} opacity={0.45} speed={0.05} />

      {/* Ambient Neon Lighting Accents */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[820px] bg-gradient-to-b from-[#0e5c7a]/35 via-[#073042]/20 to-transparent rounded-full blur-[120px]"></div>
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-[#1488b8]/20 rounded-full blur-[100px]"></div>
      </div>

      {/* Main Glass Authentication Portal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[430px] rounded-[36px] p-7 sm:p-9 relative z-10 shadow-[0_30px_90px_rgba(0,0,0,0.9)]"
        style={{
          background: 'linear-gradient(180deg, rgba(14, 38, 58, 0.86) 0%, rgba(6, 16, 26, 0.96) 100%)',
          backdropFilter: 'blur(45px)',
          WebkitBackdropFilter: 'blur(45px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
        }}
      >
        {/* Corner Accents */}
        <div className="corner-dot corner-dot-tl"></div>
        <div className="corner-dot corner-dot-tr"></div>
        <div className="corner-dot corner-dot-bl"></div>
        <div className="corner-dot corner-dot-br"></div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-300 text-[11px] font-bold tracking-wider uppercase mb-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Shorts Studio</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Clip<span className="font-serif-italic font-normal text-cyan-300">_Cut</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {authMode === 'verify_otp' 
              ? 'Complete 6-digit email verification'
              : 'Create viral vertical shorts with animated subtitles'}
          </p>
        </div>

        {/* Feedback Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error-box"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3.5 bg-red-500/15 border border-red-500/30 rounded-2xl flex flex-col gap-2 text-xs text-red-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
              {unverifiedEmailFound && (
                <button
                  type="button"
                  onClick={() => handleSendOtpForVerification(targetEmail)}
                  disabled={loading}
                  className="self-end px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 rounded-lg text-[11px] font-extrabold text-cyan-300 hover:text-white cursor-pointer transition-all disabled:opacity-50"
                >
                  Verify Email Now ➔
                </button>
              )}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              key="success-box"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 1. MODE: SIGN IN ────────────────────────────────────────── */}
        {authMode === 'signin' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => alert("To reset your password, please contact support or verify via registered email.")}
                    className="text-[11px] text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Admin Autofill Quick Demo Button */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('test@test.com');
                    setPassword('test@123');
                  }}
                  className="text-[10px] text-gray-500 hover:text-[#b8f032] transition-colors cursor-pointer"
                >
                  Admin Autofill
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 btn-premium-solid text-xs uppercase tracking-wider font-extrabold shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Google OAuth Button */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-white/[0.1]"></div>
              <span className="absolute px-3 text-[11px] text-gray-400 font-medium" style={{ background: 'rgba(10, 26, 40, 0.95)' }}>
                Or continue with
              </span>
            </div>

            <div className="flex justify-center w-full">
              <div className="w-full flex justify-center scale-[0.98]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="340"
                />
              </div>
            </div>

            {/* Switch to Create Account */}
            <div className="text-center mt-5 pt-4 border-t border-white/[0.08]">
              <span className="text-xs text-gray-400">Don't have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-xs font-bold text-[#b8f032] hover:underline cursor-pointer ml-1"
              >
                Create an account
              </button>
            </div>
          </motion.div>
        )}

        {/* ── 2. MODE: CREATE ACCOUNT ─────────────────────────────────── */}
        {authMode === 'signup' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Lee"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 btn-premium-solid text-xs uppercase tracking-wider font-extrabold shadow-xl cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Account & Sending OTP...' : 'Create Account & Send OTP'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Google OAuth Button */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-white/[0.1]"></div>
              <span className="absolute px-3 text-[11px] text-gray-400 font-medium" style={{ background: 'rgba(10, 26, 40, 0.95)' }}>
                Or continue with
              </span>
            </div>

            <div className="flex justify-center w-full">
              <div className="w-full flex justify-center scale-[0.98]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="340"
                />
              </div>
            </div>

            {/* Switch to Sign In */}
            <div className="text-center mt-4 pt-3.5 border-t border-white/[0.08]">
              <span className="text-xs text-gray-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-xs font-bold text-[#b8f032] hover:underline cursor-pointer ml-1"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        )}

        {/* ── 3. MODE: VERIFY EMAIL OTP ───────────────────────────────── */}
        {authMode === 'verify_otp' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1.5 pb-2">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center mx-auto text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] mb-2">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-white">Verify your email</h3>
                <p className="text-xs text-gray-300">
                  Enter the 6-digit code sent to:
                </p>
                <p className="text-xs font-mono font-bold text-cyan-300 break-all px-2 py-0.5 bg-black/40 rounded-lg inline-block">
                  {targetEmail}
                </p>
              </div>

              {/* 6 Individual 1-Digit OTP Boxes */}
              <div className="flex justify-between gap-1.5 py-1">
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-base font-black bg-white/[0.07] border border-white/[0.16] rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.12] transition-all font-mono"
                  />
                ))}
              </div>

              {/* Expiration Note & Resend Secondary Action */}
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-gray-400">⏱️ Valid for 5 mins</span>
                <button
                  type="button"
                  onClick={() => handleSendOtpForVerification(targetEmail)}
                  disabled={cooldown > 0 || loading}
                  className="text-cyan-300 hover:text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'RESEND CODE'}
                </button>
              </div>

              {/* Primary Verify Button */}
              <button
                type="submit"
                disabled={loading || otpValues.join('').length !== 6}
                className="w-full py-3.5 btn-premium-solid text-xs uppercase tracking-wider font-extrabold shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Verifying Code...' : 'VERIFY EMAIL'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Back Option */}
              <div className="text-center pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email / Back to Sign In</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Security / Brevo Encryption Guarantee */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Brevo Verified • 256-Bit Cryptographic Security</span>
        </div>
      </motion.div>
    </div>
  );
}
