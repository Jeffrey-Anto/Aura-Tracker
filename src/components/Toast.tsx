import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Info, Sparkles, Award, CheckSquare, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Toast: React.FC = () => {
  const { toast, setToast, rewardClaimed, claimReward } = useApp();

  useEffect(() => {
    if (toast && toast.type !== 'level-up' && toast.type !== 'badge') {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  if (!toast) return null;

  const isModal = toast.type === 'level-up' || toast.type === 'badge';

  const getIcon = () => {
    switch (toast.type) {
      case 'info':
        return <Info className="text-[#00f2fe]" size={20} />;
      case 'level-up':
        return <Sparkles className="text-[#fda085]" size={36} />;
      case 'badge':
        return <Award className="text-[#e100ff]" size={36} />;
      case 'milestone':
        return <CheckSquare className="text-[#00b09b]" size={20} />;
      default:
        return <CheckCircle2 className="text-[#00b09b]" size={20} />;
    }
  };

  return (
    <AnimatePresence>
      {isModal ? (
        // Overlay Modals (Level Up & Badge Celebrations)
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setToast(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-[#090e1a]/95 border border-white/10 rounded-2xl p-6 lg:p-8 text-center shadow-[0_0_50px_rgba(127,0,255,0.2)]"
          >
            {/* Close handle */}
            <button 
              onClick={() => setToast(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Glowing Icon Container */}
            <div className="mx-auto w-16 h-16 rounded-full bg-white/3 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
              {getIcon()}
            </div>

            <h2 className="font-heading text-2xl lg:text-3xl font-extrabold text-white mb-2 tracking-wide">
              {toast.title}
            </h2>
            <p className="text-slate-300 text-sm lg:text-base mb-6 leading-relaxed">
              {toast.message}
            </p>

            {/* Level Up Reward Feature */}
            {toast.type === 'level-up' && (
              <div className="bg-white/2 border border-white/5 rounded-xl p-4 mb-6">
                <span className="text-xs text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Level Up Reward Unlocked</span>
                <span className="text-base font-bold text-[#fda085] block mb-3">+250 XP Rank Bonus</span>
                <button
                  disabled={rewardClaimed}
                  onClick={claimReward}
                  className={`
                    w-full py-2.5 px-4 rounded-xl font-heading font-semibold text-sm transition-all duration-300
                    ${rewardClaimed 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' 
                      : 'bg-gradient-to-r from-[#f6d365] to-[#fda085] text-slate-900 shadow-[0_0_20px_rgba(253,160,133,0.3)] hover:scale-[1.02] active:scale-100'
                    }
                  `}
                >
                  {rewardClaimed ? 'Reward Claimed ✓' : 'Claim Rank Bonus'}
                </button>
              </div>
            )}

            <button
              onClick={() => setToast(null)}
              className="py-2.5 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-heading font-semibold text-sm transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      ) : (
        // Standard Floating Toasts (Bottom-Right corner)
        <div className="fixed bottom-6 right-6 z-[1000] w-full max-w-sm">
          <motion.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            className="bg-[#090e1a]/95 border border-white/10 p-4 rounded-xl flex items-start gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <div className="shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-grow flex flex-col gap-0.5">
              <span className="font-heading font-bold text-sm text-slate-100">{toast.title}</span>
              <span className="text-xs text-slate-400 leading-relaxed">{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="shrink-0 p-0.5 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
