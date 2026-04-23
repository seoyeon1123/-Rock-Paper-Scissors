'use client';
import { useCallback, useState } from 'react';
import type { Choice, Result } from '@/lib/gameLogic';
import type { Difficulty } from '@/lib/cpuStrategy';

export type GameMode = 'infinite' | 'bo3' | 'bo5';
export type SessionPhase = 'menu' | 'playing' | 'finished';

export interface RoundRecord {
  user: Choice;
  cpu: Choice;
  result: Result;
}

export interface SessionState {
  sessionPhase: SessionPhase;
  mode: GameMode;
  difficulty: Difficulty;
  score: { user: number; cpu: number };
  rounds: RoundRecord[];
  streak: number;
  bestStreak: number;
  matchResult: 'win' | 'lose' | null; // N판 모드 최종 결과
}

const INITIAL: SessionState = {
  sessionPhase: 'menu',
  mode: 'infinite',
  difficulty: 'easy',
  score: { user: 0, cpu: 0 },
  rounds: [],
  streak: 0,
  bestStreak: 0,
  matchResult: null,
};

const WIN_TARGET: Record<GameMode, number> = {
  infinite: Infinity,
  bo3: 2,
  bo5: 3,
};

export function useGameSession() {
  const [state, setState] = useState<SessionState>(INITIAL);

  const startGame = useCallback((mode: GameMode, difficulty: Difficulty) => {
    setState({
      ...INITIAL,
      sessionPhase: 'playing',
      mode,
      difficulty,
    });
  }, []);

  const recordRound = useCallback((user: Choice, cpu: Choice, result: Result) => {
    setState((s) => {
      const newScore = { ...s.score };
      if (result === 'win') newScore.user++;
      else if (result === 'lose') newScore.cpu++;

      const newStreak = result === 'win' ? s.streak + 1 : 0;
      const newBestStreak = Math.max(s.bestStreak, newStreak);

      const target = WIN_TARGET[s.mode];
      let matchResult: 'win' | 'lose' | null = null;
      let sessionPhase: SessionPhase = 'playing';

      if (newScore.user >= target) {
        matchResult = 'win';
        sessionPhase = 'finished';
      } else if (newScore.cpu >= target) {
        matchResult = 'lose';
        sessionPhase = 'finished';
      }

      return {
        ...s,
        sessionPhase,
        score: newScore,
        rounds: [...s.rounds, { user, cpu, result }],
        streak: newStreak,
        bestStreak: newBestStreak,
        matchResult,
      };
    });
  }, []);

  const backToMenu = useCallback(() => {
    setState(INITIAL);
  }, []);

  // 유저의 선택 히스토리 (CPU 전략용)
  const userHistory = state.rounds.map((r) => r.user);

  return { ...state, startGame, recordRound, backToMenu, userHistory };
}
