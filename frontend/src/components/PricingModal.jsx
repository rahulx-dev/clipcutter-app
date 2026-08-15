import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Zap, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../App';

export default function PricingModal({ isOpen, plan, onClose }) {
  const [loading, setLoading] = useState(false);
  const { token, refreshUser } = useAuth();

  if (!isOpen && !plan) return null;

  const activePlan = plan || { id: 'BASE', name: 'Standard Plan', price: '$9.99/m' };

  const handlePayment = async () => {
    if (activePlan.id === 'FREE') {
      alert("You are on the Free Plan with 3 starter projects included!");
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/billing/create-order', { 
        plan: activePlan.id,
        plan_type: activePlan.id 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { order_id, amount, currency, key_id, subscription_id } = res.data;

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "ClipCutter AI",
        description: `${activePlan.name} Subscription`,
        order_id: order_id,
        handler: async function (response) {
          try {
            await axios.post('/api/billing/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscription_id: subscription_id,
              plan_type: activePlan.id
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            alert("Payment Successful! Credits have been added to your account.");
            if (refreshUser) refreshUser();
            onClose();
          } catch (err) {
            alert("Payment verification failed. Please contact support.");
          }
        },
        theme: {
          color: "#ffffff"
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay payment gateway initialized. Please ensure internet connectivity.");
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Could not initiate payment order");
    } finally {
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
              Upgrade to <span className="text-white">{activePlan.name}</span>
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
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
                <Zap className="w-4 h-4 text-white fill-white" />
                <span>Zero watermark and full high definition export</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Priority graphics processing and 24/7 support</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-3.5 btn-premium-solid text-xs font-extrabold uppercase tracking-wider shadow-xl disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin text-black" /> : `Continue with ${activePlan.name}`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
