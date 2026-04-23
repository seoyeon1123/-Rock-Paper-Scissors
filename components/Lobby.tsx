'use client';
import { useState } from 'react';
import type { PlayerRow, Slot } from '@/lib/supabase';

interface Props {
  roomId: string;
  players: PlayerRow[];
  mySlot: Slot;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
  starting?: boolean;
}

export function Lobby({
  roomId,
  players,
  mySlot,
  isHost,
  onStart,
  onLeave,
  starting,
}: Props) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const me = players.find((p) => p.slot === mySlot);
  const other = players.find((p) => p.slot !== mySlot);
  const ready = players.length === 2;

  const copy = async (what: 'code' | 'link') => {
    const value =
      what === 'code'
        ? roomId
        : typeof window !== 'undefined'
          ? `${window.location.origin}/play/${roomId}`
          : '';
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <div className="flex flex-col items-center gap-6 mt-4 w-full max-w-lg">
      <h2 className="text-2xl font-bold">대기실</h2>

      <div className="w-full bg-slate-800/50 rounded-2xl p-6 flex flex-col items-center gap-3">
        <div className="text-sm text-slate-400">방 코드</div>
        <div className="text-4xl sm:text-5xl font-mono font-bold tracking-[0.2em] sm:tracking-[0.3em]">{roomId}</div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => copy('code')}
            className="px-4 py-2 rounded-lg border border-slate-600 text-sm hover:border-slate-400"
          >
            {copied === 'code' ? '✓ 복사됨' : '코드 복사'}
          </button>
          <button
            onClick={() => copy('link')}
            className="px-4 py-2 rounded-lg border border-slate-600 text-sm hover:border-slate-400"
          >
            {copied === 'link' ? '✓ 복사됨' : '링크 복사'}
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-3">
        <PlayerCard player={me} label="나" />
        <PlayerCard player={other} label="상대" waiting={!other} />
      </div>

      {isHost ? (
        <button
          disabled={!ready || starting}
          onClick={onStart}
          className="w-full px-5 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!ready ? '상대 대기 중...' : starting ? '시작 중...' : '게임 시작'}
        </button>
      ) : (
        <div className="w-full text-center text-slate-400 py-4">
          {ready ? '호스트가 게임을 시작하기를 기다리는 중...' : '상대 대기 중...'}
        </div>
      )}

      <button
        onClick={onLeave}
        className="text-sm text-slate-500 hover:text-slate-300"
      >
        방 나가기
      </button>
    </div>
  );
}

function PlayerCard({
  player,
  label,
  waiting,
}: {
  player: PlayerRow | undefined;
  label: string;
  waiting?: boolean;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col items-center gap-1">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold">
        {player ? player.nickname : waiting ? '대기 중...' : '-'}
      </div>
      {player && (
        <div
          className={`text-xs ${player.connected ? 'text-emerald-400' : 'text-amber-400'}`}
        >
          {player.connected ? '● 접속' : '○ 끊김'}
        </div>
      )}
    </div>
  );
}
