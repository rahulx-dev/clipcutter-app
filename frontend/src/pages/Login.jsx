import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, KeyRound, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, 
  AlertCircle, Sparkles, RefreshCw, Lock, Mail, Eye, EyeOff, Smartphone, Send
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import Cosmic3DBackground from '../components/Cosmic3DBackground';

export default function Login() {
  // Auth Tab: 'phone' | 'email'
  const [authMethod, setAuthMethod] = useState('phone');
  
  // Phone OTP Flow State: 'phone_input' | 'otp_verify'
  const [phoneStep, setPhoneStep] = useState('phone_input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtpValues, setPhoneOtpValues] = useState(['', '', '', '', '', '']);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const phoneOtpInputRefs = useRef([]);

  // Email Flow State: 'login' | 'register'
  const [emailMode, setEmailMode] = useState('login');
  const [emailStep, setEmailStep] = useState('input'); // 'input' | 'otp_verify'
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailOtpValues, setEmailOtpValues] = useState(['', '', '', '', '', '']);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [showVerifyNowBtn, setShowVerifyNowBtn] = useState(false);
  const emailOtpInputRefs = useRef([]);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Cooldown Timers ───────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (phoneCooldown > 0) {
      timer = setInterval(() => setPhoneCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [phoneCooldown]);

  useEffect(() => {
    let timer;
    if (emailCooldown > 0) {
      timer = setInterval(() => setEmailCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emailCooldown]);

  // ── Phone Input Handlers ──────────────────────────────────────────
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(val);
    if (error) setError('');
  };

  const handleSendPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (phoneNumber.length !== 10 || !/^[6-9]\d{9}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/phone/send-otp', {
        phone: phoneNumber
      });

      setMaskedPhone(res.data.phone);
      setPhoneCooldown(res.data.cooldown_seconds || 60);
      setSuccessMsg(res.data.message || 'OTP dispatched to your mobile number');
      setPhoneStep('otp_verify');
      setPhoneOtpValues(['', '', '', '', '', '']);
      setTimeout(() => phoneOtpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to dispatch SMS OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtpBoxChange = (index, value) => {
    const val = value.replace(/\D/g, '');
    if (!val) {
      const updated = [...phoneOtpValues];
      updated[index] = '';
      setPhoneOtpValues(updated);
      return;
    }

    const updated = [...phoneOtpValues];
    if (val.length > 1) {
      const digits = val.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        updated[i] = digits[i] || '';
      }
      setPhoneOtpValues(updated);
      const nextIndex = Math.min(digits.length, 5);
      phoneOtpInputRefs.current[nextIndex]?.focus();
      return;
    }

    updated[index] = val.slice(-1);
    setPhoneOtpValues(updated);

    if (index < 5 && val) {
      phoneOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePhoneOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !phoneOtpValues[index] && index > 0) {
      phoneOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    const otpCode = phoneOtpValues.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit OTP sent to your phone');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/phone/verify-otp', {
        phone: phoneNumber,
        otp_code: otpCode
      });

      login(res.data.access_token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  // ── Email / Brevo OTP Flow Handlers ───────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setShowVerifyNowBtn(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      if (emailMode === 'login') {
        const formData = new URLSearchParams();
        formData.append('username', cleanEmail);
        formData.append('password', password);
        const res = await axios.post('/api/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        login(res.data.access_token, res.data.user);
        navigate('/dashboard');
      } else {
        // Register flow: creates unverified user and sends 6-digit Brevo OTP
        const res = await axios.post('/api/auth/register', {
          email: cleanEmail,
          password,
          name: fullName || cleanEmail.split('@')[0]
        });

        setRegisteredEmail(cleanEmail);
        setEmailStep('otp_verify');
        setEmailCooldown(res.data.cooldown_seconds || 60);
        setSuccessMsg(res.data.message || `6-digit verification code sent to ${cleanEmail}`);
        setEmailOtpValues(['', '', '', '', '', '']);
        setTimeout(() => emailOtpInputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Authentication failed. Please verify your credentials.';
      setError(detail);
      if (detail.includes('verify your email')) {
        setShowVerifyNowBtn(true);
        setRegisteredEmail(cleanEmail);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (targetEmail) => {
    const cleanMail = targetEmail || registeredEmail || email.trim().toLowerCase();
    if (!cleanMail) return;

    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/send-email-otp', { email: cleanMail });
      setRegisteredEmail(cleanMail);
      setEmailStep('otp_verify');
      setEmailCooldown(res.data.cooldown_seconds || 60);
      setSuccessMsg(res.data.message || `Verification code sent to ${cleanMail}`);
      setEmailOtpValues(['', '', '', '', '', '']);
      setTimeout(() => emailOtpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpBoxChange = (index, value) => {
    const val = value.replace(/\D/g, '');
    if (!val) {
      const updated = [...emailOtpValues];
      updated[index] = '';
      setEmailOtpValues(updated);
      return;
    }

    const updated = [...emailOtpValues];
    if (val.length > 1) {
      const digits = val.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        updated[i] = digits[i] || '';
      }
      setEmailOtpValues(updated);
      const nextIndex = Math.min(digits.length, 5);
      emailOtpInputRefs.current[nextIndex]?.focus();
      return;
    }

    updated[index] = val.slice(-1);
    setEmailOtpValues(updated);

    if (index < 5 && val) {
      emailOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleEmailOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !emailOtpValues[index] && index > 0) {
      emailOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    if (e) e.preventDefault();
    const otpCode = emailOtpValues.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit verification code sent to your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/verify-email-otp', {
        email: registeredEmail || email.trim().toLowerCase(),
        otp_code: otpCode
      });

      login(res.data.access_token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  // ── Real Google OAuth Handler ─────────────────────────────────────
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
      console.error('Google login error detail:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In was cancelled or encountered an error.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#03070d]">
      
      {/* 3D Three.js Cosmic Starfield Layer */}
      <Cosmic3DBackground particleCount={500} opacity={0.45} speed={0.05} />

      {/* Dynamic Cyan & Ocean Teal Ambient Light Cones */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[800px] bg-gradient-to-b from-[#0e5c7a]/40 via-[#073042]/25 to-transparent rounded-full blur-[110px]"></div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-[#1488b8]/25 rounded-full blur-[95px]"></div>
      </div>

      {/* Main Glass Portal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[410px] rounded-[36px] p-7 sm:p-9 relative z-10 shadow-[0_30px_90px_rgba(0,0,0,0.9)]"
        style={{
          background: 'linear-gradient(180deg, rgba(16, 42, 62, 0.82) 0%, rgba(7, 18, 30, 0.94) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
        }}
      >
        {/* Subtle Decorative Elements */}
        <div className="corner-dot corner-dot-tl"></div>
        <div className="corner-dot corner-dot-tr"></div>
        <div className="corner-dot corner-dot-bl"></div>
        <div className="corner-dot corner-dot-br"></div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-[11px] font-bold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Shorts Generator</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Clip <span className="font-serif-italic font-normal text-cyan-300">Cutter</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Transform long videos into viral 9:16 vertical shorts in seconds.
          </p>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-2xl flex flex-col gap-2 text-xs text-red-200"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {showVerifyNowBtn && (
              <button
                type="button"
                onClick={() => handleSendEmailOtp(registeredEmail || email)}
                disabled={loading || emailCooldown > 0}
                className="self-end text-[11px] font-bold text-cyan-300 hover:text-white underline cursor-pointer disabled:opacity-50"
              >
                {emailCooldown > 0 ? `Resend OTP in ${emailCooldown}s` : 'Send Verification OTP Now ➔'}
              </button>
            )}
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-start gap-2 text-xs text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* Top Auth Mode Tabs (Only shown when not in OTP step) */}
        {phoneStep === 'phone_input' && emailStep === 'input' && (
          <div className="flex bg-white/[0.05] p-1 rounded-2xl border border-white/[0.08] mb-5">
            <button
              type="button"
              onClick={() => { setAuthMethod('phone'); setError(''); setSuccessMsg(''); setShowVerifyNowBtn(false); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMethod === 'phone'
                  ? 'bg-white text-black font-extrabold shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Phone OTP
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('email'); setError(''); setSuccessMsg(''); setShowVerifyNowBtn(false); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMethod === 'email'
                  ? 'bg-white text-black font-extrabold shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
          </div>
        )}

        {/* ── 1. PHONE OTP FLOW ──────────────────────────────────────── */}
        {authMethod === 'phone' && (
          <>
            {phoneStep === 'phone_input' ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Indian Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-gray-400 border-r border-white/10 pr-2">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="98765 43210"
                      className="w-full pl-20 pr-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/50 transition-all font-mono tracking-wider"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneNumber.length !== 10}
                  className="w-full py-3.5 btn-premium-solid text-xs uppercase tracking-wider font-extrabold shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Dispatching OTP...' : 'Send 6-Digit OTP'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setPhoneStep('phone_input'); setError(''); }}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change Number
                  </button>
                  <span className="text-[11px] text-cyan-300 font-mono font-bold">
                    +91 {maskedPhone}
                  </span>
                </div>

                {/* 6-Digit Pin Input Matrix */}
                <div className="flex justify-between gap-1.5 py-1">
                  {phoneOtpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (phoneOtpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePhoneOtpBoxChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePhoneOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-base font-bold bg-white/[0.06] border border-white/[0.14] rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.1] transition-all font-mono"
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400">Didn't receive SMS?</span>
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={phoneCooldown > 0 || loading}
                    className="text-cyan-300 hover:text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {phoneCooldown > 0 ? `Resend OTP (${phoneCooldown}s)` : 'Resend SMS OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneOtpValues.join('').length !== 6}
                  className="w-full py-3.5 btn-premium-solid text-xs uppercase tracking-wider font-extrabold shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying OTP...' : 'Verify Code & Sign In'}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── 2. EMAIL & BREVO OTP FLOW ──────────────────────────────── */}
        {authMethod === 'email' && (
          <>
            {emailStep === 'input' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {emailMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Lee"
                      className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/50 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-2xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/50 transition-all pr-10"
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

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('test@test.com');
                      setPassword('test@123');
                      setEmailMode('login');
                    }}
                    className="text-gray-400 hover:text-[#b8f032] transition-colors cursor-pointer"
                  >
                    Admin Autofill
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode(emailMode === 'login' ? 'register' : 'login');
                      setError('');
                      setShowVerifyNowBtn(false);
                    }}
                    className="text-[#b8f032] font-bold hover:underline cursor-pointer"
                  >
                    {emailMode === 'login' ? 'Create an account' : 'Already registered? Sign In'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 btn-premium-solid text-xs uppercase tracking-wider font-extrabold shadow-xl cursor-pointer disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : (emailMode === 'login' ? 'Sign In with Email' : 'Create Account & Send OTP')}
                </button>
              </form>
            ) : (
              /* 6-Digit Email OTP Verification Screen */
              <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setEmailStep('input'); setError(''); }}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change Email
                  </button>
                  <span className="text-[11px] text-cyan-300 font-mono font-bold truncate max-w-[190px]">
                    {registeredEmail || email}
                  </span>
                </div>

                <div className="text-center py-1">
                  <span className="text-xs font-semibold text-gray-300">
                    Enter the 6-digit code sent by Brevo:
                  </span>
                </div>

                {/* 6-Digit Pin Input Matrix */}
                <div className="flex justify-between gap-1.5 py-1">
                  {emailOtpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (emailOtpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleEmailOtpBoxChange(idx, e.target.value)}
                      onKeyDown={(e) => handleEmailOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-base font-bold bg-white/[0.06] border border-white/[0.14] rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.1] transition-all font-mono"
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400">Didn't receive email?</span>
                  <button
                    type="button"
                    onClick={() => handleSendEmailOtp(registeredEmail || email)}
                    disabled={emailCooldown > 0 || loading}
                    className="text-cyan-300 hover:text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {emailCooldown > 0 ? `Resend Code (${emailCooldown}s)` : 'Resend Email OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || emailOtpValues.join('').length !== 6}
                  className="w-full py-3.5 btn-premium-solid text-xs uppercase tracking-wider font-extrabold shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying OTP...' : 'Verify Code & Activate Account'}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── 3. REAL GOOGLE OAUTH 2.0 LOGIN BUTTON ──────────────────── */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-white/[0.1]"></div>
          <span className="absolute px-3 text-[11px] text-gray-400 font-medium" style={{ background: 'rgba(12, 30, 46, 0.9)' }}>
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

        {/* Security / Encryption Guarantee */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Brevo Verified • 256-Bit Cryptographic Security</span>
        </div>
      </motion.div>
    </div>
  );
}
