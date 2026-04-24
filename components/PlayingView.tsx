'use client';
import { useCallback } from 'react';
import { Countdown } from '@/components/Countdown';
import { GestureIndicator } from '@/components/GestureIndicator';
import { ResultPanel } from '@/components/ResultPanel';
import { RoundHistory } from '@/components/RoundHistory';
import { Scoreboard } from '@/components/Scoreboard';
import { WaitingMessage } from '@/components/WaitingMessage';
import { WebcamView } from '@/components/WebcamView';
import { useGameRound } from '@/hooks/useGameRound';
import { useHandGesture } from '@/hooks/useHandGesture';
import { playCountdownGo, playCountdownTick } from '@/lib/sounds';
import type { Difficulty } from '@/lib/cpuStrategy';
import type { Choice, Result } from '@/lib/gameLogic';
import type { GameMode, RoundRecord } from '@/hooks/useGameSession';

interface Props {
  mode: GameMode;
  difficulty: Difficulty;
  score: { user: number; cpu: number };
  streak: number;
  rounds: RoundRecord[];
  userHistory: Choice[];
  soundEnabled: boolean;
  onRecordRound: (user: Choice, cpu: Choice, result: Result) => void;
  onBackToMenu: () => void;
}

export function PlayingView({
  mode,
  difficulty,
  score,
  streak,
  rounds,
  userHistory,
  soundEnabled,
  onRecordRound,
  onBackToMenu,
}: Props) {
  const { videoRef, displayGesture, handDetected, getGesture, ready, error } =
    useHandGesture();

  const onCountdownTick = useCallback(
    (value: number) => {
      if (!soundEnabled) return;
      if (value > 0) playCountdownTick();
      else playCountdownGo();
    },
    [soundEnabled]
  );

  const { phase, countdown, userChoice, cpuChoice, result, missedReveal } =
    useGameRound({
      ready,
      handDetected,
      getGesture,
      difficulty,
      userHistory,
      paused: false,
      onRoundEnd: onRecordRound,
      onCountdownTick,
    });

  return (
    <>
      <Scoreboard
        userScore={score.user}
        cpuScore={score.cpu}
        streak={streak}
        mode={mode}
      />
      <WebcamView videoRef={videoRef} ready={ready} error={error} />
      <GestureIndicator gesture={displayGesture} />

      {phase === 'waiting' && (
        <WaitingMessage ready={ready} error={error} missedReveal={missedReveal} />
      )}
      {phase === 'countdown' && <Countdown value={countdown} />}
      {phase === 'result' && (
        <ResultPanel
          user={userChoice}
          cpu={cpuChoice}
          result={result}
          streak={streak}
          soundEnabled={soundEnabled}
        />
      )}

      <RoundHistory rounds={rounds} />

      <button
        onClick={onBackToMenu}
        className="mt-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        메뉴로 돌아가기
      </button>
    </>
  );
}
