'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createRoom, joinRoom } from '@/lib/room';
import {
  getOrCreatePlayerId,
  getNicknameCache,
  setNicknameCache,
} from '@/lib/playerId';
import type { GameMode } from '@/lib/supabase';

type Step = 'choose' | 'create' | 'join';

const MODES: { value: GameMode; label: string; desc: string }[] = [
  { value: 'bo3', label: '3판 2선승', desc: '빠른 승부' },
  { value: 'bo5', label: '5판 3선승', desc: '정석 매치' },
  { value: 'infinite', label: '무한 모드', desc: '끝없는 대결' },
];

interface Props {
  onBack: () => void;
}

export function OnlineMenu({ onBack }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [mode, setMode] = useState<GameMode>('bo3');
  const [nickname, setNickname] = useState(getNicknameCache());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCreate = async () => {
    if (!nickname.trim()) return setError('닉네임을 입력하세요');
    setBusy(true);
    setError(null);
    try {
      const playerId = getOrCreatePlayerId();
      setNicknameCache(nickname.trim());
      const roomId = await createRoom(mode, playerId, nickname.trim());
      router.push(`/play/${roomId}`);
    } catch (e: any) {
      setError(e?.message ?? '방 생성 실패');
      setBusy(false);
    }
  };

  const submitJoin = async () => {
    if (!/^\d{6}$/.test(code)) return setError('6자리 숫자 코드');
    if (!nickname.trim()) return setError('닉네임을 입력하세요');
    setBusy(true);
    setError(null);
    try {
      const playerId = getOrCreatePlayerId();
      setNicknameCache(nickname.trim());
      await joinRoom(code, playerId, nickname.trim());
      router.push(`/play/${code}`);
    } catch (e: any) {
      setError(e?.message ?? '방 참여 실패');
      setBusy(false);
    }
  };

  if (step === 'choose') {
    return (
      <div className="flex flex-col items-center gap-4 mt-4 w-full max-w-md">
        <h2 className="text-2xl font-bold">온라인 대전</h2>
        <p className="text-slate-400 text-sm">친구와 1:1 실시간 대결</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
          <button
            onClick={() => setStep('create')}
            className="flex-1 px-6 py-4 rounded-xl border-2 border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
          >
            <div className="font-bold">방 만들기</div>
            <div className="text-xs mt-1 opacity-70">새 방 생성 후 코드 공유</div>
          </button>
          <button
            onClick={() => setStep('join')}
            className="flex-1 px-6 py-4 rounded-xl border-2 border-sky-500 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-colors"
          >
            <div className="font-bold">코드로 참여</div>
            <div className="text-xs mt-1 opacity-70">친구의 6자리 코드 입력</div>
          </button>
        </div>
        <button
          onClick={onBack}
          className="mt-2 text-sm text-slate-500 hover:text-slate-300"
        >
          ← 뒤로
        </button>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="flex flex-col items-center gap-5 mt-4 w-full max-w-md">
        <h2 className="text-2xl font-bold">방 만들기</h2>

        <div className="w-full">
          <div className="text-sm text-slate-400 mb-2">게임 모드</div>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`px-2 sm:px-3 py-3 rounded-xl border-2 transition-all text-sm ${
                  mode === m.value
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-bold">{m.label}</div>
                <div className="text-[10px] mt-1 opacity-70">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full">
          <div className="text-sm text-slate-400 mb-2">닉네임</div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            placeholder="이름을 입력하세요"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none"
          />
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex gap-3 w-full">
          <button
            disabled={busy}
            onClick={() => setStep('choose')}
            className="flex-1 px-5 py-3 rounded-xl border border-slate-600 text-slate-400 hover:border-slate-500 disabled:opacity-50"
          >
            뒤로
          </button>
          <button
            disabled={busy}
            onClick={submitCreate}
            className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50"
          >
            {busy ? '생성 중...' : '방 만들기'}
          </button>
        </div>
      </div>
    );
  }

  // join
  return (
    <div className="flex flex-col items-center gap-5 mt-4 w-full max-w-md">
      <h2 className="text-2xl font-bold">코드로 참여</h2>

      <div className="w-full">
        <div className="text-sm text-slate-400 mb-2">6자리 방 코드</div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          className="w-full px-4 py-4 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-center text-2xl sm:text-3xl tracking-[0.3em] sm:tracking-[0.5em] font-mono"
        />
      </div>

      <div className="w-full">
        <div className="text-sm text-slate-400 mb-2">닉네임</div>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={16}
          placeholder="이름을 입력하세요"
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none"
        />
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="flex gap-3 w-full">
        <button
          disabled={busy}
          onClick={() => setStep('choose')}
          className="flex-1 px-5 py-3 rounded-xl border border-slate-600 text-slate-400 hover:border-slate-500 disabled:opacity-50"
        >
          뒤로
        </button>
        <button
          disabled={busy}
          onClick={submitJoin}
          className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50"
        >
          {busy ? '참여 중...' : '참여'}
        </button>
      </div>
    </div>
  );
}
