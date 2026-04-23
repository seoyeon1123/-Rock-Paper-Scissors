'use client';
import { memo } from 'react';
import { emojiOf } from '@/lib/gameLogic';
import type { RoundRecord } from '@/hooks/useGameSession';

interface Props {
  rounds: RoundRecord[];
}

const RESULT_STYLE: Record<string, string> = {
  win: 'bg-green-500/20 border-green-500/40',
  lose: 'bg-red-500/20 border-red-500/40',
  draw: 'bg-yellow-500/20 border-yellow-500/40',
};

const RESULT_LABEL: Record<string, string> = {
  win: '승',
  lose: '패',
  draw: '무',
};

export const RoundHistory = memo(function RoundHistory({ rounds }: Props) {
  if (rounds.length === 0) return null;

  const recent = rounds.slice(-10);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-slate-500">최근 라운드</div>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {recent.map((r, i) => (
          <div
            key={i}
            className={`flex flex-col items-center px-2 py-1 rounded-lg border text-xs ${RESULT_STYLE[r.result]}`}
          >
            <div className="flex gap-1">
              <span>{emojiOf(r.user)}</span>
              <span className="text-slate-500">vs</span>
              <span>{emojiOf(r.cpu)}</span>
            </div>
            <span className="text-[10px] mt-0.5 opacity-70">{RESULT_LABEL[r.result]}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
