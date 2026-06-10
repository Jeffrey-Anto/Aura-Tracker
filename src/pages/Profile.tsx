import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Calendar, Sparkles, Award, Edit3, Save, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';


export const Profile: React.FC = () => {
  const { user, profile, updateProfile, xp, level, badges } = useApp();
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync state with profile once loaded
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio || '');
      // Extract seed if it's a DiceBear URL, otherwise keep full url
      const seedMatch = profile.avatar_url?.match(/seed=([^&]+)/);
      setAvatarSeed(seedMatch ? seedMatch[1] : 'Explorer');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    
    setLoading(true);
    setSuccess(false);

    try {
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`;
      await updateProfile({
        name,
        bio,
        avatar_url: avatarUrl
      });
      setSuccess(true);
      setIsEditing(false);
      
      // Auto clear success notice
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewSeed = () => {
    const seeds = ['Jeff', 'Alex', 'Sarah', 'Jordan', 'Taylor', 'Jamie', 'Morgan', 'Casey', 'Robin', 'Aura'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 100);
    setAvatarSeed(randomSeed);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const xpInLevel = xp % 1000;
  const progressPercent = Math.min(100, Math.floor((xpInLevel / 1000) * 100));
  const unlockedBadges = badges.filter(b => b.unlocked).length;

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10">
      
      {/* Page Header */}
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-100">User Profile</h2>
        <span className="text-xs text-slate-500">Manage your credentials, biographic profile, and scholar ranks</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Editor */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <GlassCard className="flex flex-col items-center text-center py-8 relative">
            
            {/* Success Toast banner */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 bg-[#00b09b]/10 border border-[#00b09b]/25 text-[#00b09b] py-1.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                >
                  Profile Saved!
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#7f00ff] to-[#e100ff] p-[3px] shadow-[0_0_25px_rgba(225,0,255,0.25)] relative">
                <img 
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`} 
                  alt="User Avatar" 
                  className="w-full h-full rounded-full bg-[#090e1a] object-cover"
                />
              </div>

              {isEditing && (
                <button
                  onClick={generateNewSeed}
                  type="button"
                  className="absolute bottom-0 right-0 bg-[#e100ff] text-white p-1.5 rounded-full hover:scale-105 transition-transform shadow-md"
                  title="Randomize Avatar"
                >
                  <Sparkles size={12} />
                </button>
              )}
            </div>

            {!isEditing ? (
              <>
                <h3 className="font-heading text-lg font-bold text-slate-100">{profile.name}</h3>
                <span className="text-[10px] font-bold text-[#e100ff] bg-[#e100ff]/10 py-0.5 px-2.5 rounded-full mt-1.5 uppercase tracking-wide border border-[#e100ff]/10">
                  Level {level} Specialist
                </span>
                
                <p className="text-xs text-slate-400 mt-4 max-w-[200px] leading-relaxed italic">
                  {profile.bio || "No biography added yet. Click edit profile to tell us about your grinds."}
                </p>

                <div className="w-full border-t border-white/5 mt-6 pt-5 flex flex-col gap-3.5 text-left text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-slate-500" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-slate-500" />
                    <span>Joined {new Date(profile.joined_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-6 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit3 size={12} />
                  <span>Edit Profile Info</span>
                </button>
              </>
            ) : (
              <form onSubmit={handleSave} className="w-full text-left flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/3 border border-white/8 rounded-xl py-2 px-3.5 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biography / Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="E.g. Fullstack Engineer, CS Senior tracking DSA and fitness roadmaps."
                    className="w-full bg-white/3 border border-white/8 rounded-xl py-2 px-3.5 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 resize-none placeholder-slate-600"
                  />
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setName(profile.name);
                      setBio(profile.bio || '');
                      const seedMatch = profile.avatar_url?.match(/seed=([^&]+)/);
                      setAvatarSeed(seedMatch ? seedMatch[1] : 'Explorer');
                    }}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/8 text-white rounded-xl text-xs font-semibold font-heading text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 rounded-xl text-xs font-semibold font-heading flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={12} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </GlassCard>
        </div>

        {/* Right Column: Stats overview and Badges progression */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Level Progress Panel */}
          <GlassCard glowColor="primary">
            <h4 className="font-heading font-extrabold text-slate-100 text-base mb-4 flex items-center gap-2">
              <Sparkles className="text-[#00f2fe]" size={18} />
              <span>XP Level Progression</span>
            </h4>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#7f00ff] to-[#e100ff] shadow-[0_0_20px_rgba(225,0,255,0.3)] flex items-center justify-center font-heading text-4xl font-extrabold text-white shrink-0">
                {level}
              </div>
              
              <div className="flex-grow w-full flex flex-col gap-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>{xpInLevel} / 1000 XP logged in Level {level}</span>
                  <span>{progressPercent}% completed</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7f00ff] to-[#e100ff] rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(225,0,255,0.3)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Earn +100 XP per skill topic and XP matching logged hour ratios</span>
              </div>
            </div>
          </GlassCard>

          {/* Achievements badge board summary */}
          <GlassCard>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-heading font-extrabold text-slate-100 text-base flex items-center gap-2">
                <Award className="text-[#e100ff]" size={18} />
                <span>Unlocked Achievements</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-white/5 py-0.5 px-2 rounded-full">
                {unlockedBadges} / {badges.length} unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {badges.map(badge => {
                const isUnlocked = badge.unlocked;
                
                return (
                  <div 
                    key={badge.id}
                    className={`
                      border border-white/5 p-3.5 rounded-xl text-center flex flex-col items-center justify-center relative overflow-hidden group
                      ${isUnlocked ? 'bg-white/3 border-white/10 opacity-100' : 'bg-white/1 border-dashed border-white/5 opacity-30'}
                    `}
                  >
                    <div className={`
                      w-9 h-9 rounded-full flex items-center justify-center mb-2.5 text-slate-400
                      ${isUnlocked ? 'bg-[#e100ff]/10 text-[#e100ff]' : 'bg-white/2'}
                    `}>
                      {isUnlocked ? <CheckCircle2 size={16} /> : <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />}
                    </div>
                    <span className="font-heading font-bold text-[10px] text-slate-200 block truncate w-full">{badge.title}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

        </div>

      </div>

    </div>
  );
};
