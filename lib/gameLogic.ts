import type { Gesture } from './gestureRecognition';

export type Choice = 'rock' | 'paper' | 'scissors';
export type Result = 'win' | 'lose' | 'draw';

export function randomChoice(): Choice {
  const arr: Choice[] = ['rock', 'paper', 'scissors'];
  return arr[Math.floor(Math.random() * arr.length)];
}

export function judge(user: Choice, cpu: Choice): Result {
  if (user === cpu) return 'draw';
  const beats: Record<Choice, Choice> = {
    rock: 'scissors',
    scissors: 'paper',
    paper: 'rock',
  };
  return beats[user] === cpu ? 'win' : 'lose';
}

export function isValidChoice(g: Gesture): g is Choice {
  return g === 'rock' || g === 'paper' || g === 'scissors';
}

export const emojiOf = (c: Choice | null): string =>
  c === 'rock' ? '✊' : c === 'paper' ? '✋' : c === 'scissors' ? '✌️' : '❓';
