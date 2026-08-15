import React, { useState } from "react";
import { Check, ArrowLeft, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PricingModal from "../components/PricingModal";
import Cosmic3DBackground from "../components/Cosmic3DBackground";
import { useAuth } from "../App";

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const plans = [
    {
      id: "FREE",
      name: "Free Starter",
      price: "₹0",
      period: "/ forever",
      description: "Ideal for testing AI shorts and voice captions",
      features: [
        "3 full video projects included",
        "AI voice transcription and timing",
        "720p export quality",
        "Standard caption presets",
        "Community support",
      ],
      popular: false,
      buttonText: "Start Free",
      btnClass: "btn-premium-shimmer",
    },
    {
      id: "BASE",
      name: "Creator Pack",
      price: isYearly ? "₹799" : "₹99",
      period: isYearly ? "/ year" : "/ month",
      description: "For active YouTubers, Reels and TikTok creators",
      features: [
        "50 full video projects with priority speed",
        "Zero watermark and 1080x1920 HD export",
        "All 16 animated caption styles",
        "AI viral retention scoring & hook engine",
        "Priority customer support",
      ],
      popular: true,
      buttonText: "Upgrade to Creator",
      btnClass: "btn-premium-solid",
    },
    {
      id: "PRO",
      name: "Pro Agency",
      price: isYearly ? "₹1,499" : "₹199",
      period: isYearly ? "/ year" : "/ month",
      description: "For agencies and high volume production teams",
      features: [
        "150 full video projects with max queue priority",
        "Custom font and subtitle color tuning",
        "Auto multi language Hindi & Hinglish AI",
        "Batch export and direct download",
        "24/7 dedicated support",
      ],
      popular: false,
      buttonText: "Upgrade to Pro",
      btnClass: "btn-premium-shimmer",
    },
  ];

  return (
    <div className="min-h-screen obsidian-mesh-bg pt-6 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* 3D Cosmic Starfield Background */}
      <Cosmic3DBackground particleCount={500} opacity={0.4} speed={0.06} />

      {/* Ambient Top Glow Cone */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#1488b8]/20 via-[#6366f1]/10 to-transparent rounded-full blur-[130px] pointer-events-none z-0"></div>

      {/* Top Navigation Bar */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8 relative z-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full btn-premium-shimmer text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-gray-300">
          <ShieldCheck className="w-3.5 h-3.5 text-[#b8f032]" />
          <span>Secured by Razorpay • Instant Activation</span>
        </div>
      </div>

      {/* Giant Background Typography & Header */}
      <div className="relative max-w-5xl mx-auto z-10">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none select-none z-0 text-center w-full">
          <h1 className="text-[95px] sm:text-[150px] md:text-[180px] font-black text-white/[0.08] tracking-tight leading-none">
            Pricing
          </h1>
        </div>

        {/* Header Content */}
        <div className="text-center pt-8 mb-10 relative z-10 space-y-3">
          <div className="badge-linear-beacon inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#b8f032]" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              Flexible Indian Rupee Pricing
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Simple plans for <span className="font-serif-italic text-[#b8f032]">massive reach</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
            Choose the perfect plan for your video creation workflow. Cancel or upgrade at any time.
          </p>

          {/* Billing Switcher with Discount Badge */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold transition-colors ${!isYearly ? 'text-white' : 'text-gray-400'}`}>
              Monthly
            </span>
            <div 
              onClick={() => setIsYearly(!isYearly)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer flex items-center ${
                isYearly ? "bg-[#b8f032]" : "bg-white/20"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow-md transform transition-transform duration-200 ease-in-out ${
                  isYearly ? "translate-x-6" : "translate-x-0"
                }`}
              ></div>
            </div>
            <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isYearly ? 'text-white' : 'text-gray-400'}`}>
              <span>Yearly</span>
              <span className="px-2 py-0.5 rounded-full bg-[#b8f032] text-black font-black text-[9px] uppercase tracking-wider">
                Save 33%
              </span>
            </span>
          </div>
        </div>

        {/* 3 Smoked Frosted Glass Cards */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`glass-pricing-smoked rounded-3xl p-7 sm:p-8 flex flex-col justify-between relative group ${
                plan.popular ? "border-white/40 shadow-[0_24px_70px_rgba(0,0,0,0.95)]" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#b8f032] text-black text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-black" />
                  <span>Most Popular</span>
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">
                  {plan.name}
                </span>
                <p className="text-[11px] text-gray-400 mb-6 min-h-[30px] leading-relaxed">
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {plan.period}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-3.5 mb-8">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                      <div className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                        <Check className="w-2.5 h-2.5 text-[#b8f032] stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Luxury Action Button with Inner Shimmer */}
              <button
                onClick={() => setSelectedPlan(plan)}
                className={`w-full py-3.5 text-xs tracking-wider uppercase font-extrabold cursor-pointer ${plan.btnClass}`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <PricingModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  );
}
