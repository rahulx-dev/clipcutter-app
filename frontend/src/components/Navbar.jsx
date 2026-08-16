import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Scissors, LogOut, Menu, X, Zap, LayoutDashboard, CreditCard, Sparkles } from 'lucide-react';
import { useAuth } from '../App';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const innerNavRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      );
    });

    let isScrolled = false;
    const handleScroll = () => {
      if (!innerNavRef.current) return;
      if (window.scrollY > 50 && !isScrolled) {
        isScrolled = true;
        gsap.to(innerNavRef.current, {
          paddingTop: "0.25rem",
          paddingBottom: "0.25rem",
          backgroundColor: "rgba(6, 10, 18, 0.95)",
          backdropFilter: "blur(32px)",
          duration: 0.3
        });
      } else if (window.scrollY <= 50 && isScrolled) {
        isScrolled = false;
        gsap.to(innerNavRef.current, {
          paddingTop: "0.5rem",
          paddingBottom: "0.5rem",
          backgroundColor: "rgba(6, 10, 18, 0.85)",
          backdropFilter: "blur(24px)",
          duration: 0.3
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      ctx.revert();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header ref={navRef} className="fixed top-4 inset-x-0 z-50 px-4 sm:px-6 flex justify-center pointer-events-none will-change-transform">
      <div ref={innerNavRef} className="w-full max-w-4xl bg-[#060a12]/85 backdrop-blur-2xl rounded-full px-3 sm:px-5 py-2 flex items-center justify-between pointer-events-auto border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        {/* Left: Brand */}
        <Link to="/dashboard" className="flex items-center space-x-2.5 pl-2 group">
          <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center border border-white/20 group-hover:border-[#b8f032] group-hover:shadow-[0_0_12px_rgba(184,240,50,0.4)] transition-all">
            <Scissors className="w-3.5 h-3.5 text-white group-hover:text-[#b8f032] transition-colors" />
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white group-hover:text-[#b8f032] transition-colors">
            CLIPCUTTER
          </span>
        </Link>

        {/* Center: Navigation Links Pill Group (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1 bg-white/[0.04] p-1 rounded-full border border-white/10">
          <Link 
            to="/dashboard" 
            className={`px-4 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
              isActive('/dashboard') 
                ? 'bg-white text-black font-extrabold shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            to="/caption-editor" 
            className={`px-4 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
              isActive('/caption-editor') 
                ? 'bg-white text-black font-extrabold shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Caption Studio
          </Link>
          <Link 
            to="/pricing" 
            className={`px-4 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
              isActive('/pricing') 
                ? 'bg-white text-black font-extrabold shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pricing
          </Link>
        </nav>

        {/* Right: Credits and Logout (Desktop) */}
        <div className="hidden md:flex items-center space-x-3 pr-1">
          <div className="flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs shadow-inner">
            <Zap className="w-3 h-3 text-[#b8f032] fill-[#b8f032]" />
            <span className="text-[11px] font-semibold text-gray-300">Credits:</span>
            <span className="font-extrabold text-white">{isAdmin ? '∞' : (user?.credits_remaining ?? 0)}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Mobile View (Shows Credits Pill + Menu Button) */}
        <div className="md:hidden flex items-center space-x-2 pr-1">
          {/* Mobile Credits Pill */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/[0.08] border border-[#b8f032]/30 text-xs">
            <Zap className="w-3 h-3 text-[#b8f032] fill-[#b8f032]" />
            <span className="font-black text-[#b8f032] text-[11px]">{isAdmin ? '∞' : (user?.credits_remaining ?? 0)}</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-full text-gray-300 hover:text-white cursor-pointer bg-white/[0.04]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-16 inset-x-4 bg-[#060a12]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 space-y-3 pointer-events-auto shadow-2xl md:hidden">
          {/* Mobile Drawer Credits Display */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#b8f032] fill-[#b8f032]" />
              <span className="text-xs font-semibold text-gray-300">Remaining Credits</span>
            </div>
            <span className="text-sm font-black text-[#b8f032]">{isAdmin ? 'Unlimited (∞)' : `${user?.credits_remaining ?? 0} Credits`}</span>
          </div>

          <Link 
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 text-xs font-bold text-white rounded-xl bg-white/[0.08]"
          >
            Dashboard
          </Link>
          <Link 
            to="/caption-editor"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 text-xs font-bold text-gray-300 hover:text-white"
          >
            Caption Studio
          </Link>
          <Link 
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 text-xs font-bold text-gray-300 hover:text-white"
          >
            Pricing
          </Link>
          <button
            onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
            className="w-full text-left py-2.5 px-3 text-xs font-bold text-red-400 hover:text-red-300"
          >
            Log Out
          </button>
        </div>
      )}
    </header>
  );
}
