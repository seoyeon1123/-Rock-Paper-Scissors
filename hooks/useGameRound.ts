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

// 2 → "가위" · 1 → "바위" · 0 → "보!" (리빌)
const COUNTDOWN_START = 2;
const REVEAL_HOLD_MS = 400;

const INITIAL: Snapshot = {
  phase: 'waiting',
  countdown: COUNTDOWN_START,
  userChoice: null,
  cpuChoice: null,
  result: null,
  missedReveal: false,
};

interface Args {
  ready: boolean;
  handDetected: boolean;
  getGesture: () => Gesture;
  difficulty: Difficulty;
  userHistory: Choice[];
  paused: boolean; // 매치 끝나면 pause
  onRoundEnd?: (user: Choice, cpu: Choice, result: Result) => void;
  onCountdownTick?: (value: number) => void;
}

export function useGameRound({
  ready,
  handDetected,
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

  // waiting → countdown: 손이 프레임에 보이기만 하면 시작 (주먹 쥐고 대기해도 OK)
  useEffect(() => {
    if (paused) return;
    if (state.phase !== 'waiting') return;
    if (!ready) return;
    if (!handDetected) return;

    const t = setTimeout(() => {
      setState((s) =>
        s.phase === 'waiting'
          ? { ...INITIAL, phase: 'countdown', countdown: COUNTDOWN_START }
          : s
      );
    }, 500);
    return () => clearTimeout(t);
  }, [state.phase, ready, handDetected, paused]);

  // countdown tick + reveal
  // - countdown > 0: 1초 간격으로 "가위" → "바위" 진행
  // - countdown === 0: "보!" 를 REVEAL_HOLD_MS 동안 보여주며 그 순간의 제스처 캡처
  useEffect(() => {
    if (state.phase !== 'countdown') return;

    if (state.countdown === 0) {
      onCountdownTickRef.current?.(0);
      const t = setTimeout(() => {
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
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(t);
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
