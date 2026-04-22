'use client';
import { useEffect, useRef, useState } from 'react';
import {
  isValidChoice,
  judge,
  randomChoice,
  type Choice,
  type Result,
} from '@/lib/gameLogic';
import type { Gesture } from '@/lib/gestureRecognition';

export type Phase = 'waiting' | 'countdown' | 'result';

type Snapshot = {
  phase: Phase;
  countdown: number;
  userChoice: Choice | null;
  cpuChoice: Choice | null;
  result: Result | null;
  missedReveal: boolean; // true if last countdown ended without a valid hand
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
}

/**
 * Game state machine with camera-gated start:
 *
 *  waiting  ── valid hand visible for 500ms ──▶ countdown
 *  countdown── at 0 and hand valid ──▶ result
 *  countdown── at 0 and hand missing ──▶ waiting (missedReveal=true)
 *  result  ── 2s ──▶ waiting
 *
 * Design notes:
 * - `liveGesture` (throttled state) is used as a trigger in the "waiting"
 *   effect, so the countdown only begins once a hand is actually detected.
 * - `getGesture()` is called at the reveal moment to read the exact current
 *   value from a ref (unthrottled, unreactive).
 */
export function useGameRound({ ready, liveGesture, getGesture }: Args) {
  const [state, setState] = useState<Snapshot>(INITIAL);

  const getGestureRef = useRef(getGesture);
  getGestureRef.current = getGesture;

  // waiting → countdown: require camera ready + valid gesture held briefly
  useEffect(() => {
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
  }, [state.phase, ready, liveGesture]);

  // countdown tick + reveal
  useEffect(() => {
    if (state.phase !== 'countdown') return;

    if (state.countdown === 0) {
      const g = getGestureRef.current();
      if (!isValidChoice(g)) {
        // No hand at reveal — abort this round, go back to waiting
        setState({ ...INITIAL, missedReveal: true });
        return;
      }
      const cpuChoice = randomChoice();
      setState((s) => ({
        ...s,
        phase: 'result',
        userChoice: g,
        cpuChoice,
        result: judge(g, cpuChoice),
      }));
      return;
    }

    const t = setTimeout(() => {
      setState((s) => ({ ...s, countdown: s.countdown - 1 }));
    }, 1000);
    return () => clearTimeout(t);
  }, [state.phase, state.countdown]);

  // result → waiting (next round requires showing a hand again)
  useEffect(() => {
    if (state.phase !== 'result') return;
    const t = setTimeout(() => setState(INITIAL), 2000);
    return () => clearTimeout(t);
  }, [state.phase]);

  return state;
}
