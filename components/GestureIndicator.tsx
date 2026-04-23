'use client';
import { memo } from 'react';
import { emojiOf, isValidChoice } from '@/lib/gameLogic';
import type { Gesture } from '@/lib/gestureRecognition';

const GESTURE_LABEL: Record<Gesture, string> = {
  rock: '주먹 ✊',
  paper: '보 ✋',
  scissors: '가위 ✌️',
  unknown: '손을 보여주세요 🖐️',
};

export const GestureIndicator = memo(function GestureIndicator({
  gesture,
}: {
  gesture: Gesture;
}) {
  const recognized = isValidChoice(gesture);
  return (
    <div className="text-base sm:text-lg text-slate-300 text-center px-4">
      {recognized ? (
        <>
          현재 인식:{' '}
          <span className="font-mono font-bold text-white">
            {GESTURE_LABEL[gesture]}
          </span>
        </>
      ) : (
        <span className="text-yellow-400 animate-pulse">
          {GESTURE_LABEL[gesture]}
        </span>
      )}
    </div>
  );
});
