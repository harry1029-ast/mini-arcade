// src/hooks/useHighScore.ts
import { useState } from 'react';

export function useHighScore(gameKey: string) {
  const storageKey = `cyber_hi_${gameKey}`;

  // Lazy initialization: reads from localStorage only on first render
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });

  const recordScore = (score: number): boolean => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(storageKey, score.toString());
      return true; // Indicates a new high score was set
    }
    return false;
  };

  return { highScore, recordScore };
}