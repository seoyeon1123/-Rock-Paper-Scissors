'use client';
import { useEffect, useRef, useState } from 'react';
import {
  isValidChoice,
  judge,
  type Choice,
  type Result,
} from '@/lib/gameLogic';
import { cpuPick, type Difficulty } from '@/lib/cpuStrategy';
import type { Gesture } from '@/lib/gestureRecognition';

export type Phase = 'waiting' | 'countdown' | 'result';

type Snapshot = {
  phase: Phase;
  countdown: number;
  userChoice: Choice | null;
  cpuChoice: Choice | null;
  result: Result | null;
  missedReveal: boolean;
};

const INITIAL: Snapshot = {
  phase: 'waiting',
  countdown: 3,
  userChoice: null,
  cpuChoice: null,
  result: null,
  missedReveal: false,
};

interface Args {
  ready: boolean;
  liveGesture: Gesture;
  getGesture: () => Gesture;
  difficulty: Difficulty;
  userHistory: Choice[];
  paused: boolean; // 매치 끝나면 pause
  onRoundEnd?: (user: Choice, cpu: Choice, result: Result) => void;
  onCountdownTick?: (value: number) => void;
}

export function useGameRound({
  ready,
  liveGesture,
  getGesture,
  difficulty,
  userHistory,
  paused,
  onRoundEnd,
  onCountdownTick,
}: Args) {
  const [state, setState] = useState<Snapshot>(INITIAL);

  const getGestureRef = useRef(getGesture);
  getGestureRef.current = getGesture;
  const onRoundEndRef = useRef(onRoundEnd);
  onRoundEndRef.current = onRoundEnd;
  const onCountdownTickRef = useRef(onCountdownTick);
  onCountdownTickRef.current = onCountdownTick;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const userHistoryRef = useRef(userHistory);
  userHistoryRef.current = userHistory;

  // Reset when paused changes (match finished → menu)
  useEffect(() => {
    if (paused) setState(INITIAL);
  }, [paused]);

  // waiting → countdown
  useEffect(() => {
    if (paused) return;
    if (state.phase !== 'waiting') return;
    if (!ready) return;
    if (!isValidChoice(liveGesture)) return;

    const t = setTimeout(() => {
      setState((s) =>
        s.phase === 'waiting'
          ? { ...INITIAL, phase: 'countdown', countdown: 3 }
          : s
      );
    }, 500);
    return () => clearTimeout(t);
  }, [state.phase, ready, liveGesture, paused]);

  // countdown tick + reveal
  useEffect(() => {
    if (state.phase !== 'countdown') return;

    if (state.countdown === 0) {
      const g = getGestureRef.current();
      if (!isValidChoice(g)) {
        setState({ ...INITIAL, missedReveal: true });
        return;
      }
      const cpu = cpuPick(userHistoryRef.current, difficultyRef.current);
      const result = judge(g, cpu);
      setState((s) => ({
        ...s,
        phase: 'result',
        userChoice: g,
        cpuChoice: cpu,
        result,
      }));
      onRoundEndRef.current?.(g, cpu, result);
      return;
    }

    onCountdownTickRef.current?.(state.countdown);

    const t = setTimeout(() => {
      setState((s) => ({ ...s, countdown: s.countdown - 1 }));
    }, 1000);
    return () => clearTimeout(t);
  }, [state.phase, state.countdown]);

  // result → waiting
  useEffect(() => {
    if (state.phase !== 'result') return;
    const t = setTimeout(() => setState(INITIAL), 2000);
    return () => clearTimeout(t);
  }, [state.phase]);

  return state;
}
