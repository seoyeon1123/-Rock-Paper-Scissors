'use client';
import { memo } from 'react';
import { emojiOf, type Choice, type Result } from '@/lib/gameLogic';

interface Props {
  user: Choice | null;
  cpu: Choice | null;
  result: Result | null;
}

const LABEL: Record<Result, string> = { win: 'WIN!', lose: 'LOSE', draw: 'DRAW' };
const COLOR: Record<Result, string> = {
  win: 'text-green-400',
  lose: 'text-red-400',
  draw: 'text-yellow-400',
};

export const ResultPanel = memo(function ResultPanel({ user, cpu, result }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-16 text-8xl">
        <Side label="나" emoji={emojiOf(user)} />
        <Side label="CPU" emoji={emojiOf(cpu)} />
      </div>
      {result && (
        <div className={`text-5xl font-bold ${COLOR[result]}`}>{LABEL[result]}</div>
      )}
      <div className="text-slate-400 text-sm">2초 후 다음 라운드...</div>
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
