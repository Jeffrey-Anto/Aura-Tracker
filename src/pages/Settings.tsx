import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, ShieldAlert, KeyRound, Download, Upload, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { supabase } from '../utils/supabaseClient';

export const Settings: React.FC = () => {
  const { profile, updateProfile, exportUserData, importUserData, deleteUserAccount } = useApp();

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Import states
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Delete account double check state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationWord, setDeleteConfirmationWord] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleThemeToggle = () => {
    if (!profile) return;
    const nextTheme = profile.theme === 'dark' ? 'light' : 'dark';
    updateProfile({ theme: nextTheme });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const dataStr = await exportUserData();
      
      // Create and trigger a browser download
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aura_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data', err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);
    setImportLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonStr = event.target?.result as string;
          await importUserData(jsonStr);
          setImportSuccess(true);
        } catch (err: any) {
          setImportError(err.message || 'Malformed backup file.');
        } finally {
          setImportLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setImportError(err.message || 'Failed to read file.');
      setImportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationWord !== 'DELETE') return;
    setDeleteError(null);
    setDeleteLoading(true);

    try {
      await deleteUserAccount();
      // Sign out and redirect is handled inside the AppContext deleteUserAccount method
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeleteLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10 max-w-4xl">
      
      {/* Page Header */}
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-100">Preferences & Settings</h2>
        <span className="text-xs text-slate-500">Configure theme rendering, backup datasets, and account credentials</span>
      </div>

      {/* Row 1: Appearance theme toggle */}
      <GlassCard className="flex items-center justify-between py-5" glowColor="none">
        <div>
          <h4 className="font-heading font-bold text-sm text-slate-100">Appearance Mode</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Toggle between dark night theme and light mode.</p>
        </div>

        <button
          onClick={handleThemeToggle}
          className="w-12 h-6 rounded-full bg-white/5 border border-white/10 p-1 flex items-center relative cursor-pointer"
        >
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`w-4 h-4 rounded-full flex items-center justify-center text-slate-900 ${profile.theme === 'dark' ? 'ml-6 bg-[#e100ff]' : 'bg-[#00f2fe]'}`}
          >
            {profile.theme === 'dark' ? (
              <Moon size={10} className="text-white" />
            ) : (
              <Sun size={10} className="text-slate-900" />
            )}
          </motion.div>
        </button>
      </GlassCard>

      {/* Row 2: Security Change Password Form */}
      <GlassCard>
        <h4 className="font-heading font-extrabold text-slate-100 text-base mb-4 flex items-center gap-2">
          <KeyRound className="text-[#00f2fe]" size={18} />
          <span>Security Credentials</span>
        </h4>

        <form onSubmit={handlePasswordChange} className="max-w-md flex flex-col gap-4 mt-2">
          {passwordError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-[#00b09b]/10 border border-[#00b09b]/25 text-[#00b09b] p-3 rounded-xl text-xs flex items-center gap-2">
              <ShieldCheck size={14} className="shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
            <input
              type="password"
              required
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              required
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-fit py-2 px-5 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.2)] hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            {passwordLoading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </GlassCard>

      {/* Row 3: Data backup (Export & Import) */}
      <GlassCard>
        <h4 className="font-heading font-extrabold text-slate-100 text-base mb-4 flex items-center gap-2">
          <Download className="text-[#e100ff]" size={18} />
          <span>Local Backup Console</span>
        </h4>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-xl">
          Export your entire Aura database profile (logs, streaks, roadmaps, goals, and tasks) as a portable JSON file, or restore it anytime. Import will overwrite matching local schemas.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleExport}
            className="py-2.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Export Archive JSON</span>
          </button>

          <label className="py-2.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer select-none">
            <Upload size={14} />
            <span>{importLoading ? 'Importing...' : 'Import Backup JSON'}</span>
            <input
              type="file"
              accept=".json"
              disabled={importLoading}
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        <AnimatePresence>
          {importError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 mt-4 max-w-md"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{importError}</span>
            </motion.div>
          )}

          {importSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#00b09b]/10 border border-[#00b09b]/25 text-[#00b09b] p-3 rounded-xl text-xs flex items-center gap-2 mt-4 max-w-md"
            >
              <ShieldCheck size={14} className="shrink-0" />
              <span>Aura data backup imported and synced successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Row 4: Dangerous section (Delete account) */}
      <GlassCard className="border-red-950/20" glowColor="none">
        <h4 className="font-heading font-extrabold text-red-400 text-base mb-2 flex items-center gap-2">
          <ShieldAlert className="text-red-500" size={18} />
          <span>Danger Zone</span>
        </h4>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-xl">
          Permanently delete your Aura account and purge all stored data (goals, logs, tasks, profile metadata) from our PostgreSQL servers. This operation is irreversible.
        </p>

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="py-2.5 px-5 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/10 transition-colors font-heading font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 size={14} />
          <span>Delete Account Completely</span>
        </button>
      </GlassCard>

      {/* Double confirmation Delete Modal Overlay */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md bg-[#090e1a]/95 border border-red-500/20 rounded-2xl p-6 lg:p-8 text-center shadow-[0_0_40px_rgba(255,8,68,0.15)] z-10"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-4 text-red-400">
                <ShieldAlert size={24} />
              </div>

              <h3 className="font-heading font-extrabold text-slate-100 text-lg mb-1">
                Are you absolutely sure?
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                This will delete your credentials and purge your historical datasets. Type <strong className="text-red-400 font-extrabold">DELETE</strong> in the box below to verify.
              </p>

              {deleteError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 mb-4 text-left">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <input
                type="text"
                value={deleteConfirmationWord}
                onChange={(e) => setDeleteConfirmationWord(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full text-center bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-xs outline-none focus:border-red-500/40 placeholder-slate-700 font-bold uppercase tracking-wider mb-6"
              />

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmationWord('');
                  }}
                  className="py-2.5 px-5 bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl text-xs font-heading font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmationWord !== 'DELETE' || deleteLoading}
                  className={`
                    py-2.5 px-5 text-white font-heading font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer
                    ${deleteConfirmationWord === 'DELETE' && !deleteLoading 
                      ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(239,68,68,0.25)] hover:scale-[1.01]' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                    }
                  `}
                >
                  {deleteLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Purge My Account</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
