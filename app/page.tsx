'use client';
import { Countdown } from '@/components/Countdown';
import { GestureIndicator } from '@/components/GestureIndicator';
import { ResultPanel } from '@/components/ResultPanel';
import { WaitingMessage } from '@/components/WaitingMessage';
import { WebcamView } from '@/components/WebcamView';
import { useGameRound } from '@/hooks/useGameRound';
import { useHandGesture } from '@/hooks/useHandGesture';

export default function Page() {
  const { videoRef, displayGesture, getGesture, ready, error } = useHandGesture();
  const { phase, countdown, userChoice, cpuChoice, result, missedReveal } =
    useGameRound({ ready, liveGesture: displayGesture, getGesture });

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-bold">웹캠 가위바위보</h1>
      <WebcamView videoRef={videoRef} ready={ready} error={error} />
      <GestureIndicator gesture={displayGesture} />
      {phase === 'waiting' && (
        <WaitingMessage ready={ready} error={error} missedReveal={missedReveal} />
      )}
      {phase === 'countdown' && <Countdown value={countdown} />}
      {phase === 'result' && (
        <ResultPanel user={userChoice} cpu={cpuChoice} result={result} />
      )}
    </main>
  );
}
