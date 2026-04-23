'use client';
import { memo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { playVictory, playLose } from '@/lib/sounds';

interface Props {
  result: 'win' | 'lose';
  userScore: number;
  cpuScore: number;
  bestStreak: number;
  soundEnabled: boolean;
  onBack: () => void;
}

export const MatchResult = memo(function MatchResult({
  result,
  userScore,
  cpuScore,
  bestStreak,
  soundEnabled,
  onBack,
}: Props) {
  useEffect(() => {
    if (result === 'win') {
      if (soundEnabled) playVictory();
      // 폭죽 연출
      const end = Date.now() + 2000;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else {
      if (soundEnabled) playLose();
    }
  }, [result, soundEnabled]);

  const isWin = result === 'win';

  return (
    <div className="flex flex-col items-center gap-5 sm:gap-6 mt-6 sm:mt-8 px-4 w-full">
      <div
        className={`text-5xl sm:text-7xl font-black text-center ${
          isWin ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {isWin ? 'VICTORY!' : 'DEFEAT'}
      </div>
      <div className="text-xl sm:text-2xl text-slate-300 text-center">
        최종 스코어: <span className="text-blue-400 font-bold">{userScore}</span>
        {' : '}
        <span className="text-red-400 font-bold">{cpuScore}</span>
      </div>
      {bestStreak >= 2 && (
        <div className="text-base sm:text-lg text-orange-400 text-center">
          최고 연승: {bestStreak}연승 {'🔥'.repeat(Math.min(bestStreak, 5))}
        </div>
      )}
      <button
        onClick={onBack}
        className="mt-2 sm:mt-4 px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-base sm:text-lg font-bold transition-all sm:hover:scale-105 active:scale-95"
      >
        메뉴로 돌아가기
      </button>
    </div>
  );
});
