'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Lobby } from '@/components/Lobby';
import { NicknameGate } from '@/components/NicknameGate';
import { OnlinePlayingView } from '@/components/OnlinePlayingView';
import { OpponentLeftView } from '@/components/OpponentLeftView';
import { SoundToggle } from '@/components/SoundToggle';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';
import { startMatch } from '@/lib/room';
import { getNicknameCache } from '@/lib/playerId';

export default function PlayRoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const roomId = params.roomId;
  const state = useOnlineRoom(roomId);
  const { soundEnabled, toggleSound } = useSoundEnabled();
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  // 아래 훅들은 early return 위에 있어야 함 (Rules of Hooks).
  // 상대가 나간 뒤에도 마지막 닉네임을 유지해서 메시지에 보여주려고 ref 에 백업.
  const opp = state.players.find((p) => p.slot !== state.mySlot);
  const lastOppNicknameRef = useRef<string | null>(null);
  useEffect(() => {
    if (opp?.nickname) lastOppNicknameRef.current = opp.nickname;
  }, [opp?.nickname]);

  const onJoin = async (nickname: string) => {
    setJoining(true);
    setJoinErr(null);
    try {
      await state.join(nickname);
    } catch (e: any) {
      setJoinErr(e?.message ?? '참여 실패');
    } finally {
      setJoining(false);
    }
  };

  const onStart = async () => {
    setStarting(true);
    try {
      await startMatch(roomId, state.playerId);
    } catch (e: any) {
      alert(e?.message ?? '시작 실패');
    } finally {
      setStarting(false);
    }
  };

  const onLeave = async () => {
    await state.leave();
    router.push('/');
  };

  if (state.status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">방 정보 불러오는 중...</div>
      </main>
    );
  }

  if (state.status === 'not-found') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-xl">방을 찾을 수 없어요</div>
        <div className="text-sm text-slate-400">
          코드가 잘못됐거나, 방이 이미 사라졌을 수 있어요.
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2 rounded-xl border border-slate-600 hover:border-slate-400"
        >
          메인으로
        </button>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">에러: {state.error}</div>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2 rounded-xl border border-slate-600 hover:border-slate-400"
        >
          메인으로
        </button>
      </main>
    );
  }

  if (state.status === 'need-nickname') {
    if (state.players.length >= 2) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="text-xl">방이 가득 찼어요</div>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2 rounded-xl border border-slate-600 hover:border-slate-400"
          >
            메인으로
          </button>
        </main>
      );
    }
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-6 sm:p-8">
        <NicknameGate
          initialNickname={getNicknameCache()}
          onSubmit={onJoin}
          busy={joining}
          error={joinErr}
        />
      </main>
    );
  }

  // status === 'ready'
  const inActiveMatch =
    state.room?.status === 'playing' || state.room?.status === 'finished';
  const opponentLeft =
    inActiveMatch && state.mySlot != null && state.players.length < 2;

  return (
    <main className="min-h-screen flex flex-col items-center gap-4 sm:gap-6 px-4 py-6 sm:p-8 w-full max-w-3xl mx-auto">
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />

      {state.room?.status === 'waiting' && state.mySlot != null && (
        <Lobby
          roomId={roomId}
          players={state.players}
          mySlot={state.mySlot}
          isHost={state.isHost}
          onStart={onStart}
          onLeave={onLeave}
          starting={starting}
        />
      )}

      {opponentLeft && (
        <OpponentLeftView
          opponentNickname={lastOppNicknameRef.current ?? undefined}
          onLeave={onLeave}
        />
      )}

      {!opponentLeft &&
        state.room &&
        state.mySlot != null &&
        (state.room.status === 'playing' || state.room.status === 'finished') && (
          <OnlinePlayingView
            roomId={roomId}
            playerId={state.playerId}
            room={state.room}
            players={state.players}
            roundsByNumber={state.roundsByNumber}
            mySlot={state.mySlot}
            isHost={state.isHost}
            channel={state.channel}
            soundEnabled={soundEnabled}
            onLeave={onLeave}
          />
        )}
    </main>
  );
}
