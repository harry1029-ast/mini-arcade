// src/components/layout/CyberBackground.tsx
import React from 'react';

export const CyberBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#04060d]">
      <div className="cyber-grid-plane opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-transparent to-[#04060d]" />
    </div>
  );
};