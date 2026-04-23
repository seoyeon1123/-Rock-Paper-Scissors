'use client';
import { useState } from 'react';

interface Props {
  initialNickname?: string;
  onSubmit: (nickname: string) => void;
  busy?: boolean;
  error?: string | null;
}

export function NicknameGate({ initialNickname = '', onSubmit, busy, error }: Props) {
  const [nickname, setNickname] = useState(initialNickname);

  const submit = () => {
    if (!nickname.trim()) return;
    onSubmit(nickname.trim());
  };

  return (
    <div className="flex flex-col items-center gap-5 mt-8 w-full max-w-md">
      <h2 className="text-2xl font-bold">닉네임을 입력하세요</h2>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        maxLength={16}
        placeholder="이름"
        autoFocus
        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none"
      />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <button
        disabled={busy || !nickname.trim()}
        onClick={submit}
        className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50"
      >
        {busy ? '참여 중...' : '입장'}
      </button>
    </div>
  );
}
