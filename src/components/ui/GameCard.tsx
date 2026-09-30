// src/components/ui/GameCard.tsx
import React from 'react';
import type { GameMetadata } from '../../types/arcade';
import { Play } from 'lucide-react';

interface GameCardProps {
  game: GameMetadata;
  highScore: number;
  onSelect: (id: GameMetadata['id']) => void;
}

const ACCENT_STYLES = {
  cyan: {
    border: 'border-cyan-500/30 hover:border-cyan-400',
    shadow: 'hover:shadow-[0_0_25px_rgba(0,243,255,0.25)]',
    text: 'text-cyan-400',
    badge: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40',
    button: 'bg-cyan-500 text-black hover:bg-cyan-400',
  },
  pink: {
    border: 'border-pink-500/30 hover:border-pink-400',
    shadow: 'hover:shadow-[0_0_25px_rgba(255,0,127,0.25)]',
    text: 'text-pink-400',
    badge: 'border-pink-500/40 text-pink-300 bg-pink-950/40',
    button: 'bg-pink-500 text-white hover:bg-pink-400',
  },
  green: {
    border: 'border-emerald-500/30 hover:border-emerald-400',
    shadow: 'hover:shadow-[0_0_25px_rgba(57,255,20,0.25)]',
    text: 'text-emerald-400',
    badge: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
    button: 'bg-emerald-400 text-black hover:bg-emerald-300',
  },
  amber: {
    border: 'border-amber-500/30 hover:border-amber-400',
    shadow: 'hover:shadow-[0_0_25px_rgba(255,170,0,0.25)]',
    text: 'text-amber-400',
    badge: 'border-amber-500/40 text-amber-300 bg-amber-950/40',
    button: 'bg-amber-400 text-black hover:bg-amber-300',
  },
  purple: {
    border: 'border-purple-500/30 hover:border-purple-400',
    shadow: 'hover:shadow-[0_0_25px_rgba(188,19,254,0.25)]',
    text: 'text-purple-400',
    badge: 'border-purple-500/40 text-purple-300 bg-purple-950/40',
    button: 'bg-purple-500 text-white hover:bg-purple-400',
  },
};

export const GameCard: React.FC<GameCardProps> = ({ game, highScore, onSelect }) => {
  const styles = ACCENT_STYLES[game.accent];

  return (
    <div
      onClick={() => onSelect(game.id)}
      className={`group relative flex flex-col justify-between p-6 bg-[#080d1a]/80 backdrop-blur-md border ${styles.border} ${styles.shadow} transition-all duration-300 cursor-pointer overflow-hidden`}
    >
      {/* Top Protocol Tag */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-arcade text-[10px] tracking-wider text-gray-500 group-hover:text-gray-300">
            {game.node}
          </span>
          <span className={`text-[10px] font-arcade px-2 py-0.5 border ${styles.badge}`}>
            {game.badge}
          </span>
        </div>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl select-none">{game.icon}</span>
          <h3 className={`font-cyber font-bold text-lg md:text-xl tracking-wide ${styles.text}`}>
            {game.title}
          </h3>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed font-mono mb-6">
          {game.description}
        </p>
      </div>

      {/* Footer Info & Action */}
      <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-arcade text-gray-500">RECORD</span>
          <span className="font-arcade text-xs text-yellow-400 tracking-wider">
            {highScore.toString().padStart(5, '0')}
          </span>
        </div>

        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-arcade transition-transform group-hover:scale-105 ${styles.button}`}
        >
          <Play className="w-3 h-3 fill-current" /> PLAY
        </button>
      </div>
    </div>
  );
};