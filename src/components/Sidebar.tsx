import React, { useState } from 'react';
import { LayoutDashboard, Activity, Code2, LineChart, Trophy, Menu, X, ClipboardList, LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuraLogo } from './AuraLogo';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { profile, signOut } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Task Manager', icon: ClipboardList },
    { id: 'activity', label: 'Activity Tracker', icon: Activity },
    { id: 'skills', label: 'Skills Tracker', icon: Code2 },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'achievements', label: 'Achievements', icon: Trophy }
  ];

  const handleNavClick = (pageId: string) => {
    setCurrentPage(pageId);
    setMobileOpen(false);
    setUserMenuOpen(false);
    window.location.hash = pageId;
  };

  const handleUserMenuClick = (pageId: string) => {
    setCurrentPage(pageId);
    setUserMenuOpen(false);
    window.location.hash = pageId;
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
  };

  return (
    <>
      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#090e1a]/80 border-b border-white/5 backdrop-blur-md z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00f2fe]/10 flex items-center justify-center border border-[#00f2fe]/20">
            <AuraLogo size={18} />
          </div>
          <span className="font-heading font-bold text-xl bg-gradient-to-r from-[#00f2fe] to-[#4facfe] bg-clip-text text-transparent">Aura</span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 w-[260px] bg-[#090e1a]/85 border-r border-white/5 backdrop-blur-2xl z-50
        flex flex-col shrink-0 transition-transform duration-300 lg:translate-x-0 lg:static
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 border-b border-white/5 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00f2fe]/10 flex items-center justify-center border border-[#00f2fe]/20">
              <AuraLogo size={18} />
            </div>
            <span className="font-heading text-2xl font-bold bg-gradient-to-r from-[#00f2fe] to-[#4facfe] bg-clip-text text-transparent tracking-wide">
              Aura
            </span>
          </div>
          {/* Close button inside mobile menu */}
          <button 
            onClick={() => setMobileOpen(false)} 
            className="lg:hidden p-1 text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow py-6 px-4 flex flex-col gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 border text-left cursor-pointer
                  ${isActive 
                    ? 'text-[#00f2fe] bg-[#00f2fe]/6 border-[#00f2fe]/15 shadow-[0_0_15px_rgba(0,242,254,0.05)]' 
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/3 hover:border-white/5'
                  }
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer Dropdown Menu */}
        <div className="p-5 border-t border-white/5 relative">
          {userMenuOpen && (
            <div className="absolute bottom-16 left-4 right-4 bg-[#090e1a] border border-white/10 p-2.5 rounded-xl shadow-xl flex flex-col gap-1 z-[60] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                onClick={() => handleUserMenuClick('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${currentPage === 'profile' ? 'text-[#00f2fe] bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/3'}`}
              >
                <User size={14} />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => handleUserMenuClick('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${currentPage === 'settings' ? 'text-[#00f2fe] bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/3'}`}
              >
                <SettingsIcon size={14} />
                <span>App Settings</span>
              </button>
              <div className="h-[1px] bg-white/5 my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg text-left text-[#ff4769] hover:bg-red-500/5 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {profile && (
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center justify-between p-1.5 hover:bg-white/3 rounded-xl transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7f00ff] to-[#e100ff] p-[2px] shadow-[0_0_10px_rgba(225,0,255,0.2)] shrink-0">
                  <img 
                    src={profile.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Explorer'} 
                    alt="User Avatar" 
                    className="w-full h-full rounded-full bg-[#090e1a] object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-slate-100 truncate">{profile.name}</span>
                  <span className="text-[10px] text-slate-500 font-bold truncate uppercase mt-0.5">LVL {profile.level} Specialist</span>
                </div>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)} 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30" 
        />
      )}

      {/* Close dropdown menu when clicking elsewhere */}
      {userMenuOpen && (
        <div 
          onClick={() => setUserMenuOpen(false)} 
          className="fixed inset-0 z-40 cursor-default" 
        />
      )}
    </>
  );
};
