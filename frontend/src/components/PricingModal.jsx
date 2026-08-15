import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Zap, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../App';

export default function PricingModal({ isOpen, plan, onClose }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { token, refreshUser } = useAuth();

  if (!isOpen && !plan) return null;

  const activePlan = plan || { id: 'BASE', name: 'Creator Pack', price: '₹99/m' };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (activePlan.id === 'FREE') {
      alert("You are on the Free Plan with 3 starter projects included!");
      onClose();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Ensure Razorpay SDK is available
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK could not be loaded. Please check your internet connection or disable adblockers.");
      }

      // 2. Request backend order creation
      const res = await axios.post('/api/billing/create-order', { 
        plan: activePlan.id,
        plan_type: activePlan.id 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { order_id, amount, currency, key_id, subscription_id } = res.data;

      // 3. Configure Razorpay checkout options
      const options = {
        key: key_id,
        amount: amount,
        currency: currency || "INR",
        name: "ClipCutter AI",
        description: `${activePlan.name} Subscription`,
        order_id: order_id,
        handler: async function (response) {
          try {
            setLoading(true);
            const verifyRes = await axios.post('/api/billing/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscription_id: subscription_id,
              plan_type: activePlan.id
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Payment Successful! ${verifyRes.data?.credits || ''} credits have been added to your account.`);
            if (refreshUser) refreshUser();
            onClose();
          } catch (err) {
            console.error("Payment verification error:", err);
            setErrorMsg(err.response?.data?.detail || "Payment verification failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        },
        theme: {
          color: "#b8f032"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error);
        setErrorMsg(response.error?.description || "Payment was declined or cancelled.");
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      console.error("Order creation error:", err);
      const detail = err.response?.data?.detail || err.message || "Could not initiate payment order. Please try again.";
      setErrorMsg(detail);
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          className="glass-authkit rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
        >
          <div className="corner-dot corner-dot-tl"></div>
          <div className="corner-dot corner-dot-tr"></div>
          <div className="corner-dot corner-dot-bl"></div>
          <div className="corner-dot corner-dot-br"></div>

          <div className="flex justify-between items-center p-6 border-b border-white/[0.08]">
            <h2 className="text-base font-extrabold text-white">
              Upgrade to <span className="text-[#b8f032]">{activePlan.name}</span>
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {errorMsg && (
              <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Plan Selected</p>
                <p className="text-xl font-extrabold text-white mt-0.5">{activePlan.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Price</p>
                <p className="text-2xl font-black text-white mt-0.5">{activePlan.price}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#b8f032] fill-[#b8f032]" />
                <span>Zero watermark and full 1080x1920 HD shorts export</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#b8f032]" />
                <span>Secured by Razorpay • Instant account activation</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-3.5 btn-premium-solid text-xs font-extrabold uppercase tracking-wider shadow-xl disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin text-black" /> : `Pay with Razorpay (${activePlan.price})`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
