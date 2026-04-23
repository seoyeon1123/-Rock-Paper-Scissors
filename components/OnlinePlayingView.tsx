'use client';
import { useCallback, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Countdown } from '@/components/Countdown';
import { GestureIndicator } from '@/components/GestureIndicator';
import { ResultPanel } from '@/components/ResultPanel';
import { WebcamView } from '@/components/WebcamView';
import { useHandGesture } from '@/hooks/useHandGesture';
import { useOnlineRound } from '@/hooks/useOnlineRound';
import { playCountdownGo, playCountdownTick, playVictory } from '@/lib/sounds';
import { rematch } from '@/lib/room';
import type { GameMode, PlayerRow, RoomRow, RoundRow, Slot } from '@/lib/supabase';

interface Props {
  roomId: string;
  playerId: string;
  room: RoomRow;
  players: PlayerRow[];
  roundsByNumber: Record<number, RoundRow>;
  mySlot: Slot;
  isHost: boolean;
  channel: RealtimeChannel | null;
  soundEnabled: boolean;
  onLeave: () => void;
}

const MODE_LABEL: Record<GameMode, string> = {
  bo3: '3판 2선승',
  bo5: '5판 3선승',
  infinite: '무한 모드',
};

export function OnlinePlayingView({
  roomId,
  playerId,
  room,
  players,
  roundsByNumber,
  mySlot,
  isHost,
  channel,
  soundEnabled,
  onLeave,
}: Props) {
  const { videoRef, displayGesture, getGesture, ready, error } = useHandGesture();
  const [rematchBusy, setRematchBusy] = useState(false);

  const me = players.find((p) => p.slot === mySlot);
  const opp = players.find((p) => p.slot !== mySlot);

  const onCountdownTick = useCallback(
    (v: number) => {
      if (!soundEnabled) return;
      if (v > 0) playCountdownTick();
      else playCountdownGo();
    },
    [soundEnabled]
  );

  const r = useOnlineRound({
    roomId,
    playerId,
    mySlot,
    channel,
    room,
    roundsByNumber,
    ready,
    liveGesture: displayGesture,
    getGesture,
    onCountdownTick,
  });

  const onRematch = async () => {
    setRematchBusy(true);
    try {
      await rematch(roomId, playerId);
    } catch (e: any) {
      alert(e?.message ?? '재매치 실패');
    } finally {
      setRematchBusy(false);
    }
  };

  // 매치 종료 상태이고 reveal 애니메이션도 끝난 경우 → MatchResult 화면
  if (room.status === 'finished' && r.phase !== 'reveal') {
    const myScore = me?.score ?? 0;
    const oppScore = opp?.score ?? 0;
    const won = room.match_result === (mySlot === 1 ? 'p1' : 'p2');
    return (
      <MatchEnd
        won={won}
        myNickname={me?.nickname ?? '나'}
        oppNickname={opp?.nickname ?? '상대'}
        myScore={myScore}
        oppScore={oppScore}
        roomId={roomId}
        isHost={isHost}
        onRematch={onRematch}
        rematchBusy={rematchBusy}
        onLeave={onLeave}
        soundEnabled={soundEnabled && won}
      />
    );
  }

  const oppDisconnected = opp ? !opp.connected : false;

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
        <div className="text-xs text-slate-500 px-3 py-1 rounded-full border border-slate-700">
          {MODE_LABEL[room.mode]}
        </div>
        <div className="flex items-center gap-3 sm:gap-4 bg-slate-800/80 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-slate-700">
          <div className="text-center">
            <div className="text-xs text-slate-400 truncate max-w-[80px]">
              {me?.nickname ?? '나'}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-400 tabular-nums">
              {me?.score ?? 0}
            </div>
          </div>
          <div className="text-xl sm:text-2xl text-slate-600 font-light">:</div>
          <div className="text-center">
            <div className="text-xs text-slate-400 truncate max-w-[80px]">
              {opp?.nickname ?? '상대'}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-400 tabular-nums">
              {opp?.score ?? 0}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500">라운드 {room.current_round}</div>
      </div>

      <WebcamView videoRef={videoRef} ready={ready} error={error} />
      <GestureIndicator gesture={displayGesture} />

      {oppDisconnected && (
        <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-sm">
          상대 연결이 끊어졌어요. 재접속 대기 중...
        </div>
      )}

      {r.phase === 'waiting' && !oppDisconnected && (
        <OnlineWaitingHint
          ready={ready}
          error={error}
          myReady={r.myReady}
          oppReady={r.opponentReady}
          missedReveal={r.missedReveal}
        />
      )}
      {r.phase === 'countdown' && <Countdown value={r.countdown} />}
      {r.phase === 'committed' && (
        <div className="px-4 py-3 text-slate-300">상대의 제출을 기다리는 중...</div>
      )}
      {r.phase === 'reveal' && (
        <ResultPanel
          user={r.myChoice}
          cpu={r.oppChoice}
          result={r.result}
          streak={0}
          soundEnabled={soundEnabled}
          opponentLabel={opp?.nickname ?? '상대'}
          hintText="다음 라운드 준비..."
        />
      )}

      <button
        onClick={onLeave}
        className="mt-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        방 나가기
      </button>
    </>
  );
}

function OnlineWaitingHint({
  ready,
  error,
  myReady,
  oppReady,
  missedReveal,
}: {
  ready: boolean;
  error: string | null;
  myReady: boolean;
  oppReady: boolean;
  missedReveal: boolean;
}) {
  if (error) return null;
  if (!ready) {
    return <div className="text-slate-400">카메라 준비 중...</div>;
  }
  if (missedReveal) {
    return (
      <div className="text-amber-400">
        제스처를 놓쳤어요 — 랜덤으로 제출됐습니다. 다시 준비하세요.
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="text-slate-300">
        {myReady && oppReady
          ? '곧 시작합니다...'
          : myReady
            ? '상대 대기 중...'
            : oppReady
              ? '상대는 준비 완료. 제스처를 보여주세요'
              : '손 제스처를 카메라에 보여주세요'}
      </div>
      <div className="flex gap-4 text-xs text-slate-500 mt-1">
        <span className={myReady ? 'text-emerald-400' : ''}>
          나 {myReady ? '✓' : '…'}
        </span>
        <span className={oppReady ? 'text-emerald-400' : ''}>
          상대 {oppReady ? '✓' : '…'}
        </span>
      </div>
    </div>
  );
}

function MatchEnd({
  won,
  myNickname,
  oppNickname,
  myScore,
  oppScore,
  roomId,
  isHost,
  onRematch,
  rematchBusy,
  onLeave,
  soundEnabled,
}: {
  won: boolean;
  myNickname: string;
  oppNickname: string;
  myScore: number;
  oppScore: number;
  roomId: string;
  isHost: boolean;
  onRematch: () => void;
  rematchBusy: boolean;
  onLeave: () => void;
  soundEnabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 mt-8 px-4 w-full">
      <div className={`text-5xl sm:text-6xl font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
        {won ? '승리!' : '패배'}
      </div>
      <PlayAudio on={soundEnabled} />
      <div className="flex gap-6 sm:gap-8 text-xl sm:text-2xl">
        <div className="flex flex-col items-center">
          <div className="text-sm text-slate-400 truncate max-w-[120px]">{myNickname}</div>
          <div className="text-3xl sm:text-4xl font-bold text-blue-400">{myScore}</div>
        </div>
        <div className="text-slate-600 text-2xl sm:text-3xl self-center">:</div>
        <div className="flex flex-col items-center">
          <div className="text-sm text-slate-400 truncate max-w-[120px]">{oppNickname}</div>
          <div className="text-3xl sm:text-4xl font-bold text-red-400">{oppScore}</div>
        </div>
      </div>
      <div className="text-xs text-slate-500">방 코드: {roomId}</div>

      <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-sm">
        {isHost ? (
          <button
            disabled={rematchBusy}
            onClick={onRematch}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50"
          >
            {rematchBusy ? '시작 중...' : '재매치'}
          </button>
        ) : (
          <div className="flex-1 px-6 py-3 text-slate-400 text-sm text-center">
            호스트의 재매치를 기다리는 중...
          </div>
        )}
        <button
          onClick={onLeave}
          className="flex-1 px-6 py-3 rounded-xl border border-slate-600 hover:border-slate-400"
        >
          방 나가기
        </button>
      </div>
    </div>
  );
}

function PlayAudio({ on }: { on: boolean }) {
  // 화면 진입 시 한 번만 재생
  const [done, setDone] = useState(false);
  if (on && !done) {
    playVictory();
    setDone(true);
  }
  return null;
}
