import React from 'react';

interface AuraLogoProps {
  size?: number;
  className?: string;
}

export const AuraLogo: React.FC<AuraLogoProps> = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="aura-logo-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#e100ff" />
        </linearGradient>
      </defs>
      {/* Upward growing nodes representing analytics & progress */}
      <path 
        d="M4 18V14M9 18V10M14 18V6M19 18V2" 
        stroke="url(#aura-logo-grad)" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      {/* Connecting trajectory curve showing learning and productivity path */}
      <path 
        d="M4 14C6.5 10.5 11.5 6.5 19 2" 
        stroke="#ffffff" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeDasharray="1 3"
        className="opacity-70"
      />
      {/* Glow dot representing peak efficiency */}
      <circle cx="19" cy="2" r="2.5" fill="#00f2fe" className="animate-pulse" />
    </svg>
  );
};
