import React from 'react';
import auraLogoImg from '../assets/aura-logo-transparent.png';

interface AuraLogoProps {
  size?: number;
  className?: string;
}

export const AuraLogo: React.FC<AuraLogoProps> = ({ size = 28, className = "" }) => {
  return (
    <img 
      src={auraLogoImg} 
      alt="Aura Logo" 
      style={size ? { width: size, height: 'auto' } : undefined}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  );
};
