'use client';
import { memo, useState } from 'react';
import type { GameMode } from '@/hooks/useGameSession';
import type { Difficulty } from '@/lib/cpuStrategy';

interface Props {
  onStart: (mode: GameMode, difficulty: Difficulty) => void;
}

const MODES: { value: GameMode; label: string; desc: string }[] = [
  { value: 'bo3', label: '3판 2선승', desc: '빠른 승부' },
  { value: 'bo5', label: '5판 3선승', desc: '정석 매치' },
  { value: 'infinite', label: '무한 모드', desc: '끝없는 대결' },
];

const DIFFICULTIES: { value: Difficulty; label: string; desc: string; color: string }[] = [
  { value: 'easy', label: '쉬움', desc: '완전 랜덤', color: 'border-green-500 text-green-400' },
  { value: 'normal', label: '보통', desc: '패턴 약간 분석', color: 'border-yellow-500 text-yellow-400' },
  { value: 'hard', label: '어려움', desc: '마르코프 체인 예측', color: 'border-red-500 text-red-400' },
];

export const ModeSelect = memo(function ModeSelect({ onStart }: Props) {
  const [mode, setMode] = useState<GameMode>('bo3');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 mt-4 w-full">
      <p className="text-slate-400 text-center">손 제스처로 CPU와 대결하세요</p>

      {/* 모드 선택 */}
      <div className="flex flex-col items-center gap-3 w-full">
        <h2 className="text-lg font-semibold text-slate-300">게임 모드</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`px-3 sm:px-5 py-3 rounded-xl border-2 transition-all ${
                mode === m.value
                  ? 'border-blue-500 bg-blue-500/20 text-white sm:scale-105'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-sm sm:text-base">{m.label}</div>
              <div className="text-[10px] sm:text-xs mt-1 opacity-70">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 난이도 선택 */}
      <div className="flex flex-col items-center gap-3 w-full">
        <h2 className="text-lg font-semibold text-slate-300">CPU 난이도</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`px-3 sm:px-5 py-3 rounded-xl border-2 transition-all ${
                difficulty === d.value
                  ? `${d.color} bg-white/5 sm:scale-105`
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-sm sm:text-base">{d.label}</div>
              <div className="text-[10px] sm:text-xs mt-1 opacity-70">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 시작 버튼 */}
      <button
        onClick={() => onStart(mode, difficulty)}
        className="mt-2 sm:mt-4 w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-lg sm:text-xl font-bold
                   hover:from-blue-500 hover:to-purple-500 transition-all sm:hover:scale-105 active:scale-95"
      >
        게임 시작
      </button>
    </div>
  );
});
