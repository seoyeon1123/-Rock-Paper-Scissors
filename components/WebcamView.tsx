'use client';
import { memo, type ReactNode, type RefObject } from 'react';

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  ready: boolean;
  error: string | null;
}

export const WebcamView = memo(function WebcamView({ videoRef, ready, error }: Props) {
  return (
    <div className="relative w-full max-w-[640px] aspect-[4/3]">
      <video
        ref={videoRef}
        className="w-full h-full rounded-xl border-2 border-slate-700 scale-x-[-1] bg-black object-cover"
        width={640}
        height={480}
        playsInline
        muted
      />
      {!ready && !error && <Overlay tone="neutral">카메라 준비 중...</Overlay>}
      {error && (
        <Overlay tone="error">
          <div className="font-bold">카메라 접근 실패</div>
          <div className="text-sm mt-2">{error}</div>
        </Overlay>
      )}
    </div>
  );
});

function Overlay({ tone, children }: { tone: 'neutral' | 'error'; children: ReactNode }) {
  const bg = tone === 'error' ? 'bg-red-900/80' : 'bg-black/60';
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center rounded-xl text-center px-4 ${bg}`}
    >
      <div>{children}</div>
    </div>
  );
}
