// src/components/ui/CRTOverlay.tsx
import React from 'react';

export const CRTOverlay: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return <div className="crt-overlay" />;
};