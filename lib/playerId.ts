'use client';

const KEY = 'rps.playerId';

export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export function getNicknameCache(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('rps.nickname') ?? '';
}

export function setNicknameCache(nickname: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('rps.nickname', nickname);
}
