'use client';
import { memo } from 'react';

export const Countdown = memo(function Countdown({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-slate-400 text-sm">가위 바위 보!</div>
      <div
        key={value}
        className="text-6xl sm:text-7xl font-bold text-amber-300 tabular-nums animate-countdown"
      >
        {value === 0 ? '!' : value}
      </div>
    </div>
  );
});
