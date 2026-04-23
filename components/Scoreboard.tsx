'use client';
import { memo } from 'react';
import type { GameMode } from '@/hooks/useGameSession';

interface Props {
  userScore: number;
  cpuScore: number;
  streak: number;
  mode: GameMode;
}

const MODE_LABEL: Record<GameMode, string> = {
  bo3: '3판 2선승',
  bo5: '5판 3선승',
  infinite: '무한 모드',
};

export const Scoreboard = memo(function Scoreboard({
  userScore,
  cpuScore,
  streak,
  mode,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
      <div className="text-xs text-slate-500 px-3 py-1 rounded-full border border-slate-700">
        {MODE_LABEL[mode]}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 bg-slate-800/80 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-slate-700">
        <div className="text-center">
          <div className="text-xs text-slate-400">나</div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-400 tabular-nums">{userScore}</div>
        </div>
        <div className="text-xl sm:text-2xl text-slate-600 font-light">:</div>
        <div className="text-center">
          <div className="text-xs text-slate-400">CPU</div>
          <div className="text-2xl sm:text-3xl font-bold text-red-400 tabular-nums">{cpuScore}</div>
        </div>
      </div>

      {streak >= 2 && (
        <div className="flex items-center gap-1 px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full animate-bounce">
          <span className="text-orange-400 font-bold text-sm">{streak}연승</span>
          <span>{'🔥'.repeat(Math.min(streak - 1, 3))}</span>
        </div>
      )}
    </div>
  );
});
