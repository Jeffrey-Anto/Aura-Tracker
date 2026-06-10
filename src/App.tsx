import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toast } from './components/Toast';
import { Dashboard } from './pages/Dashboard';
import { ActivityTracker } from './pages/ActivityTracker';
import { SkillsTracker } from './pages/SkillsTracker';
import { Analytics } from './pages/Analytics';
import { Achievements } from './pages/Achievements';
import { Tasks } from './pages/Tasks';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Auth } from './pages/Auth';
import { useApp } from './context/AppContext';
import { isSupabaseConfigured } from './utils/supabaseClient';
import { Database, HelpCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const { user, authLoading } = useApp();

  // Synchronize with URL hash on load / change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validPages = ['dashboard', 'tasks', 'activity', 'skills', 'analytics', 'achievements', 'profile', 'settings'];
      if (validPages.includes(hash)) {
        setCurrentPage(hash);
      } else {
        setCurrentPage('dashboard');
        window.location.hash = 'dashboard';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Init load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'tasks':
        return <Tasks />;
      case 'activity':
        return <ActivityTracker />;
      case 'skills':
        return <SkillsTracker />;
      case 'analytics':
        return <Analytics />;
      case 'achievements':
        return <Achievements />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  // 1. Onboarding Connection Wizard if Supabase credentials are missing
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#060913] text-slate-100 px-4 py-12 relative overflow-hidden">
        <div className="blob blob-1 w-[400px] h-[400px] top-[-50px] left-[-50px] opacity-15" />
        <div className="blob blob-2 w-[400px] h-[400px] bottom-[-50px] right-[-50px] opacity-15" />

        <div className="w-full max-w-lg glass-panel rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_10px_45px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/15 to-transparent" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#4facfe] flex items-center justify-center text-slate-900 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <Database size={20} />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-white">Configure Database Connection</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Step 1: Setup Local Environment</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Welcome to Aura! To unlock private accounts, live databases, and real-time statistics, connect a free Supabase instance.
          </p>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-3 bg-white/2 border border-white/5 p-3.5 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-[#00f2fe]/10 text-[#00f2fe] font-heading font-bold text-xs flex items-center justify-center shrink-0">1</span>
              <div className="text-xs">
                <strong className="text-slate-200">Create a Supabase Project</strong>
                <p className="text-slate-400 mt-0.5">Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#00f2fe] hover:underline">supabase.com</a>, sign up, and create a new database project.</p>
              </div>
            </div>

            <div className="flex gap-3 bg-white/2 border border-white/5 p-3.5 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-[#00f2fe]/10 text-[#00f2fe] font-heading font-bold text-xs flex items-center justify-center shrink-0">2</span>
              <div className="text-xs">
                <strong className="text-slate-200">Expose Schema Structure</strong>
                <p className="text-slate-400 mt-0.5">Open the SQL Editor in Supabase, paste and run the contents of the file <span className="font-mono text-[11px] text-[#e100ff] bg-white/5 px-1 py-0.5 rounded">supabase_schema.sql</span> (located in your project root).</p>
              </div>
            </div>

            <div className="flex gap-3 bg-white/2 border border-white/5 p-3.5 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-[#00f2fe]/10 text-[#00f2fe] font-heading font-bold text-xs flex items-center justify-center shrink-0">3</span>
              <div className="text-xs">
                <strong className="text-slate-200">Link API Keys</strong>
                <p className="text-slate-400 mt-0.5">Copy your Project URL & anon public key from settings, paste them in your project root's <span className="font-mono text-[11px] text-[#00f2fe] bg-white/5 px-1 py-0.5 rounded">.env</span> file, and restart the dev server.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-5 text-[11px] text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5"><HelpCircle size={14} /> Need help? Check README.md</span>
            <span className="text-white/60">Aura Analytics OS</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Auth Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#060913] text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-[#00f2fe] rounded-full animate-spin" />
          <span className="font-heading text-xs font-bold uppercase text-slate-500 tracking-widest animate-pulse">Initializing Aura...</span>
        </div>
      </div>
    );
  }

  // 3. User Guard Route
  if (!user) {
    return <Auth />;
  }

  // 4. Authenticated Workspace Layout
  return (
    <div className="relative min-h-screen bg-[#060913] text-slate-100 flex overflow-hidden">
      {/* Background Ambient Glow Blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* Sidebar navigation */}
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Main content frame */}
      <div className="flex-grow flex flex-col h-screen overflow-hidden">
        {/* Top bar details */}
        <Topbar currentPage={currentPage} />

        {/* Viewport content area */}
        <main className="flex-grow overflow-y-auto px-6 py-8 lg:px-10">
          {renderPage()}
        </main>
      </div>

      {/* Gamification notifications overlay portal */}
      <Toast />
    </div>
  );
};

export default App;
