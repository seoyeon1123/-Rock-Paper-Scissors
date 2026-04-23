'use client';
import { memo } from 'react';

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export const SoundToggle = memo(function SoundToggle({ enabled, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 w-10 h-10 flex items-center justify-center
                 rounded-full bg-slate-800 border border-slate-600 hover:bg-slate-700
                 transition-all text-lg"
      style={{
        top: 'max(0.75rem, env(safe-area-inset-top))',
        right: 'max(0.75rem, env(safe-area-inset-right))',
      }}
      title={enabled ? '사운드 끄기' : '사운드 켜기'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
});
