'use client';
import { memo } from 'react';

// value 2 → "가위", 1 → "바위", 0 → "보!" (리빌 순간)
const LABEL: Record<number, string> = {
  2: '가위',
  1: '바위',
  0: '보!',
};

export const Countdown = memo(function Countdown({ value }: { value: number }) {
  const label = LABEL[value] ?? String(value);
  const isReveal = value === 0;
  return (
    <div className="flex flex-col items-center">
      <div className="text-slate-400 text-sm">손을 내주세요</div>
      <div
        key={value}
        className={`text-5xl sm:text-7xl font-bold animate-countdown ${
          isReveal ? 'text-amber-300' : 'text-slate-200'
        }`}
      >
        {label}
      </div>
    </div>
  );
});
