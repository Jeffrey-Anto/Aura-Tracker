import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'primary' | 'secondary' | 'accent' | 'success' | 'gold' | 'none';
  onClick?: () => void;
  hoverScale?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  onClick,
  hoverScale = false
}) => {
  const glowStyles = {
    primary: 'hover:border-[#00f2fe]/30 hover:shadow-[0_0_25px_rgba(0,242,254,0.08)]',
    secondary: 'hover:border-[#e100ff]/30 hover:shadow-[0_0_25px_rgba(225,0,255,0.08)]',
    accent: 'hover:border-[#ff0844]/30 hover:shadow-[0_0_25px_rgba(255,8,68,0.08)]',
    success: 'hover:border-[#00b09b]/30 hover:shadow-[0_0_25px_rgba(0,176,155,0.08)]',
    gold: 'hover:border-[#f6d365]/30 hover:shadow-[0_0_25px_rgba(246,211,101,0.08)]',
    none: ''
  };

  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }
      }
    : {};

  return (
    <motion.div
      {...interactiveProps}
      whileHover={hoverScale || onClick ? { y: -4, scale: 1.01 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${glowColor !== 'none' ? glowStyles[glowColor] : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Upper Border Shine Overlay */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
};
