// src/components/ui/TouchController.tsx
import React, { useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface TouchControllerProps {
  onDirectionPress?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onDirectionRelease?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onActionPress?: (action: string) => void;
  onActionRelease?: (action: string) => void;
  layout?: 'dpad' | 'horizontal' | 'pong';
  actionLabel?: string;
  accentColor?: string;
}

export const TouchController: React.FC<TouchControllerProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onActionPress,
  onActionRelease,
  layout = 'dpad',
  actionLabel = 'ACTION',
  accentColor = '#00f3ff',
}) => {
  const triggerHaptic = useCallback((ms = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }, []);

  const handleDirStart = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    triggerHaptic(12);
    onDirectionPress?.(dir);
  };

  const handleDirEnd = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    onDirectionRelease?.(dir);
  };

  const handleActionStart = (action: string) => {
    triggerHaptic(20);
    onActionPress?.(action);
  };

  const handleActionEnd = (action: string) => {
    onActionRelease?.(action);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-4 px-3 flex items-center justify-between touch-control select-none md:hidden">
      {/* 4-way D-Pad */}
      {layout === 'dpad' && (
        <div className="grid grid-cols-3 gap-1.5 w-44 mx-auto">
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDirStart('UP'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('UP'); }}
            className="h-12 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 rounded active:bg-cyan-400 active:text-black transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div />

          <button
            onTouchStart={(e) => { e.preventDefault(); handleDirStart('LEFT'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('LEFT'); }}
            className="h-12 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 rounded active:bg-cyan-400 active:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onTouchStart={(e) => { e.preventDefault(); handleDirStart('DOWN'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('DOWN'); }}
            className="h-12 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 rounded active:bg-cyan-400 active:text-black transition-colors"
          >
            <ArrowDown className="w-5 h-5" />
          </button>

          <button
            onTouchStart={(e) => { e.preventDefault(); handleDirStart('RIGHT'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('RIGHT'); }}
            className="h-12 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 rounded active:bg-cyan-400 active:text-black transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 2-Way Left/Right + Action (Breakout & Slime) */}
      {layout === 'horizontal' && (
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDirStart('LEFT'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('LEFT'); }}
              className="w-16 h-14 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 rounded active:bg-cyan-400 active:text-black"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDirStart('RIGHT'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('RIGHT'); }}
              className="w-16 h-14 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 rounded active:bg-cyan-400 active:text-black"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          <button
            onTouchStart={(e) => { e.preventDefault(); handleActionStart('PRIMARY'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleActionEnd('PRIMARY'); }}
            style={{ borderColor: accentColor }}
            className="flex-1 h-14 font-arcade text-xs tracking-wider border bg-black/60 text-white rounded active:opacity-80 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,0,0,0.5)]"
          >
            {actionLabel}
          </button>
        </div>
      )}

      {/* Up/Down Vertical Paddle (Pong) */}
      {layout === 'pong' && (
        <div className="flex justify-between w-full px-4">
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDirStart('UP'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('UP'); }}
            className="w-24 h-16 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs rounded active:bg-cyan-400 active:text-black"
          >
            ▲ UP
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDirStart('DOWN'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleDirEnd('DOWN'); }}
            className="w-24 h-16 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs rounded active:bg-cyan-400 active:text-black"
          >
            ▼ DOWN
          </button>
        </div>
      )}
    </div>
  );
};