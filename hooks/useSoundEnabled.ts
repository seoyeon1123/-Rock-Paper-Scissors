'use client';
import { useCallback, useState } from 'react';

export function useSoundEnabled() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const toggleSound = useCallback(() => setSoundEnabled((v) => !v), []);
  return { soundEnabled, toggleSound };
}
