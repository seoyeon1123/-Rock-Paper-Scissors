'use client';
import { useState } from 'react';
import { MatchResult } from '@/components/MatchResult';
import { ModeSelect } from '@/components/ModeSelect';
import { OnlineMenu } from '@/components/OnlineMenu';
import { PlayingView } from '@/components/PlayingView';
import { SoundToggle } from '@/components/SoundToggle';
import { useGameSession } from '@/hooks/useGameSession';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';

type MenuTab = 'cpu' | 'online';

export default function Page() {
  const { soundEnabled, toggleSound } = useSoundEnabled();
  const session = useGameSession();
  const [menuTab, setMenuTab] = useState<MenuTab>('cpu');

  return (
    <main className="min-h-screen flex flex-col items-center gap-4 sm:gap-6 px-4 py-6 sm:p-8 w-full max-w-3xl mx-auto">
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />

      {session.sessionPhase === 'menu' && (
        <>
          <h1 className="text-3xl sm:text-4xl font-bold mt-4 text-center">웹캠 가위바위보</h1>

          <div className="flex gap-2 bg-slate-800/50 rounded-xl p-1">
            <TabButton
              active={menuTab === 'cpu'}
              onClick={() => setMenuTab('cpu')}
            >
              🤖 CPU 대전
            </TabButton>
            <TabButton
              active={menuTab === 'online'}
              onClick={() => setMenuTab('online')}
            >
              🌐 온라인 1:1
            </TabButton>
          </div>

          {menuTab === 'cpu' && <ModeSelect onStart={session.startGame} />}
          {menuTab === 'online' && <OnlineMenu onBack={() => setMenuTab('cpu')} />}
        </>
      )}

      {session.sessionPhase === 'playing' && (
        <PlayingView
          mode={session.mode}
          difficulty={session.difficulty}
          score={session.score}
          streak={session.streak}
          rounds={session.rounds}
          userHistory={session.userHistory}
          soundEnabled={soundEnabled}
          onRecordRound={session.recordRound}
          onBackToMenu={session.backToMenu}
        />
      )}

      {session.sessionPhase === 'finished' && session.matchResult && (
        <MatchResult
          result={session.matchResult}
          userScore={session.score.user}
          cpuScore={session.score.cpu}
          bestStreak={session.bestStreak}
          soundEnabled={soundEnabled}
          onBack={session.backToMenu}
        />
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 sm:px-5 py-2 text-sm sm:text-base rounded-lg transition-all ${
        active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
