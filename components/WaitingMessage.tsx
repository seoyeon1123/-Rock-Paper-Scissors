'use client';
import { memo } from 'react';

interface Props {
  ready: boolean;
  error: string | null;
  missedReveal: boolean;
}

export const WaitingMessage = memo(function WaitingMessage({
  ready,
  error,
  missedReveal,
}: Props) {
  if (error) {
    return (
      <div className="text-red-400 text-center">
        <div className="font-bold">카메라를 사용할 수 없습니다</div>
        <div className="text-sm mt-1 text-red-300">{error}</div>
      </div>
    );
  }
  if (!ready) {
    return <div className="text-slate-300">카메라 연결 중...</div>;
  }
  return (
    <div className="text-slate-300 text-center">
      <div className="text-xl">
        ✋ 카메라에 손을 보여주세요
      </div>
      <div className="text-sm text-slate-500 mt-1">
        주먹 · 가위 · 보 중 하나가 인식되면 카운트다운이 시작됩니다
      </div>
      {missedReveal && (
        <div className="text-amber-400 text-sm mt-2">
          직전 라운드에서 손을 인식하지 못했어요. 다시 보여주세요.
        </div>
      )}
    </div>
  );
});
