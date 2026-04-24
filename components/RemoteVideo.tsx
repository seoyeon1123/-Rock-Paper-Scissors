'use client';
import { memo, useEffect, useRef } from 'react';
import type { VideoCallDiag } from '@/hooks/useVideoCall';

interface Props {
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  diag?: VideoCallDiag;
}

export const RemoteVideo = memo(function RemoteVideo({
  stream,
  connectionState,
  diag,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    if (stream) v.play().catch(() => {});
  }, [stream]);

  // 트랙이 도착하면 stream 이 있고 connectionState 가 connected/connecting 까지 감.
  // 스트림이 세팅됐으면 오버레이를 숨겨서 (아직 connected 전이라도) 영상 재생 시도.
  const showOverlay = !stream;
  const overlayText =
    connectionState === 'failed'
      ? '영상 연결 실패 — 네트워크 확인'
      : connectionState === 'disconnected'
        ? '연결 끊김 — 재연결 중...'
        : connectionState === 'connecting'
          ? 'P2P 연결 중...'
          : '상대 카메라 대기 중...';

  return (
    <div className="relative w-full max-w-[640px] aspect-[4/3]">
      <video
        ref={videoRef}
        className="w-full h-full rounded-xl border-2 border-slate-700 bg-black object-cover"
        playsInline
        autoPlay
        muted
      />
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 text-slate-300 text-center px-4">
          <div>
            <div className="text-sm">{overlayText}</div>
            {diag && (
              <div className="text-[10px] text-slate-500 mt-2 font-mono leading-relaxed">
                <div>conn: {connectionState} · sig: {diag.signaling}</div>
                <div>ice: {diag.iceConn} · gather: {diag.iceGathering}</div>
                <div>
                  offer↑{diag.offerSent} · ans↓{diag.answerRecv} · ice↓
                  {diag.iceRecv} · remoteDesc: {diag.hasRemoteDesc ? '✓' : '✗'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
