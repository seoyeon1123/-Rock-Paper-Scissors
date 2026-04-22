'use client';
import { memo } from 'react';
import { emojiOf, isValidChoice } from '@/lib/gameLogic';
import type { Gesture } from '@/lib/gestureRecognition';

export const GestureIndicator = memo(function GestureIndicator({
  gesture,
}: {
  gesture: Gesture;
}) {
  return (
    <div className="text-lg text-slate-300">
      현재 인식: <span className="font-mono text-white">{gesture}</span>
      <span className="ml-2 text-3xl align-middle">
        {emojiOf(isValidChoice(gesture) ? gesture : null)}
      </span>
    </div>
  );
});
