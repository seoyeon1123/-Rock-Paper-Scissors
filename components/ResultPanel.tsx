'use client';
import { memo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { emojiOf, type Choice, type Result } from '@/lib/gameLogic';
import { playWin, playLose, playDraw, playStreak } from '@/lib/sounds';

interface Props {
  user: Choice | null;
  cpu: Choice | null;
  result: Result | null;
  streak: number;
  soundEnabled: boolean;
  opponentLabel?: string;
  hintText?: string;
}

const LABEL: Record<Result, string> = { win: '승리!', lose: '패배', draw: '무승부' };
const COLOR: Record<Result, string> = {
  win: 'text-green-400',
  lose: 'text-red-400',
  draw: 'text-yellow-400',
};

export const ResultPanel = memo(function ResultPanel({
  user,
  cpu,
  result,
  streak,
  soundEnabled,
  opponentLabel = 'CPU',
  hintText = '2초 후 다음 라운드...',
}: Props) {
  const played = useRef(false);

  useEffect(() => {
    if (!result || played.current) return;
    played.current = true;

    if (soundEnabled) {
      if (result === 'win') {
        playWin();
        if (streak >= 3) playStreak();
      } else if (result === 'lose') {
        playLose();
      } else {
        playDraw();
      }
    }

    if (result === 'win') {
      confetti({
        particleCount: 60 + streak * 20,
        spread: 70,
        origin: { y: 0.7 },
      });
    }

    return () => {
      played.current = false;
    };
  }, [result, streak, soundEnabled]);

  // shake 애니메이션 (패배 시)
  const shakeClass = result === 'lose' ? 'animate-shake' : '';
  // 승리 시 scale-up
  const winClass = result === 'win' ? 'animate-pop' : '';

  return (
    <div className={`flex flex-col items-center gap-4 ${shakeClass}`}>
      <div className={`flex gap-8 sm:gap-16 text-6xl sm:text-8xl ${winClass}`}>
        <Side label="나" emoji={emojiOf(user)} />
        <Side label={opponentLabel} emoji={emojiOf(cpu)} />
      </div>
      {result && (
        <div className={`text-4xl sm:text-5xl font-bold ${COLOR[result]} animate-pop`}>
          {LABEL[result]}
        </div>
      )}
      {streak >= 2 && result === 'win' && (
        <div className="text-lg sm:text-xl text-orange-400 font-bold animate-bounce text-center">
          {streak}연승! {'🔥'.repeat(Math.min(streak, 5))}
        </div>
      )}
      <div className="text-slate-400 text-sm">{hintText}</div>
    </div>
  );
});

function Side({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-slate-400">{label}</div>
      <div>{emoji}</div>
    </div>
  );
}
