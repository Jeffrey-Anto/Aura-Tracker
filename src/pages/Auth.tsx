import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, KeyRound, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { GlassCard } from '../components/GlassCard';
import { AuraLogo } from '../components/AuraLogo';

interface AuthProps {
  onAuthSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Clear messages when mode changes
  useEffect(() => {
    setError(null);
    setMessage(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0]
            }
          }
        });

        if (signUpError) throw signUpError;
        
        // In Supabase, if email confirmation is enabled, user needs to check email.
        // Otherwise, they are immediately signed in.
        if (data.session) {
          setMessage('Account created successfully!');
          if (onAuthSuccess) onAuthSuccess();
        } else {
          setMessage('Sign up successful! Please check your email to confirm your account.');
        }
      } else if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
        
        if (onAuthSuccess) onAuthSuccess();
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`
        });

        if (resetError) throw resetError;

        setMessage('Password reset email sent! Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#060913]">
      {/* Background glow blobs */}
      <div className="blob blob-1 w-[400px] h-[400px] top-[-50px] left-[-50px] opacity-15" />
      <div className="blob blob-2 w-[400px] h-[400px] bottom-[-50px] right-[-50px] opacity-15" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* App Title */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="mb-3 flex items-center justify-center">
            <AuraLogo size={48} className="drop-shadow-[0_0_20px_rgba(0,242,254,0.35)]" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold bg-gradient-to-r from-[#00f2fe] to-[#4facfe] bg-clip-text text-transparent tracking-wide">
            AURA
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Personal Analytics Operating System</p>
        </div>

        <GlassCard className="border border-white/8 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" glowColor={mode === 'signup' ? 'secondary' : 'primary'}>
          {/* Mode Tabs */}
          {mode !== 'forgot' && (
            <div className="flex bg-white/3 border border-white/5 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold font-heading transition-all ${mode === 'login' ? 'bg-[#00f2fe] text-slate-900 shadow-[0_0_15px_rgba(0,242,254,0.25)]' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold font-heading transition-all ${mode === 'signup' ? 'bg-[#e100ff] text-white shadow-[0_0_15px_rgba(225,0,255,0.25)]' : 'text-slate-400 hover:text-white'}`}
              >
                Create Account
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="font-heading font-extrabold text-slate-100 text-lg">Reset Password</h2>
              <p className="text-slate-500 text-xs mt-1">We'll send a password recovery email to your inbox.</p>
            </div>
          )}

          {/* Form alert states */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs mb-4 flex items-start gap-2.5 overflow-hidden"
              >
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#00b09b]/10 border border-[#00b09b]/20 text-[#00b09b] rounded-xl p-3.5 text-xs mb-4 flex items-start gap-2.5 overflow-hidden"
              >
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <span>{message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name input (SignUp only) */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/3 border border-white/8 rounded-xl py-3 pl-11 pr-4 text-slate-100 text-xs outline-none focus:border-[#e100ff]/40 placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 text-slate-500" size={16} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/3 border border-white/8 rounded-xl py-3 pl-11 pr-4 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Password inputs (Login & SignUp only) */}
            {mode !== 'forgot' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[10px] text-[#00f2fe] font-bold hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/3 border border-white/8 rounded-xl py-3 pl-11 pr-11 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Password confirmation (SignUp only) */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/3 border border-white/8 rounded-xl py-3 pl-11 pr-4 text-slate-100 text-xs outline-none focus:border-[#e100ff]/40 placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Remember Me toggle (Login only) */}
            {mode === 'login' && (
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/10 bg-white/3 accent-[#00f2fe] h-4 w-4"
                />
                <span>Keep me signed in</span>
              </label>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                mt-3 w-full py-3 text-slate-900 font-heading font-semibold text-sm rounded-xl 
                transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer
                ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' : 
                  mode === 'signup' 
                    ? 'bg-gradient-to-r from-[#e100ff] to-[#7f00ff] text-white shadow-[0_0_20px_rgba(225,0,255,0.3)]' 
                    : 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                }
              `}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Link'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Back link (Forgot mode only) */}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="mt-6 text-xs text-slate-400 hover:text-white block w-full text-center font-semibold transition-colors"
            >
              ← Back to Sign In
            </button>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};
