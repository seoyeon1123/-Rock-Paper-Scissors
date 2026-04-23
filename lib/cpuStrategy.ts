import type { Choice } from './gameLogic';

export type Difficulty = 'easy' | 'normal' | 'hard';

/**
 * easy:   완전 랜덤
 * normal: 유저가 가장 많이 낸 손을 이기는 손을 40% 확률로 냄
 * hard:   직전 2수 패턴을 기반으로 마르코프 체인 예측, 70% 확률로 예측 손을 이기는 손
 */

const ALL: Choice[] = ['rock', 'paper', 'scissors'];
const BEATS: Record<Choice, Choice> = {
  rock: 'paper',
  paper: 'scissors',
  scissors: 'rock',
};

function randomChoice(): Choice {
  return ALL[Math.floor(Math.random() * ALL.length)];
}

function weightedPick(weights: Record<Choice, number>): Choice {
  const total = weights.rock + weights.paper + weights.scissors;
  const r = Math.random() * total;
  let acc = 0;
  for (const c of ALL) {
    acc += weights[c];
    if (r <= acc) return c;
  }
  return randomChoice();
}

export function cpuPick(history: Choice[], difficulty: Difficulty): Choice {
  if (difficulty === 'easy' || history.length === 0) {
    return randomChoice();
  }

  if (difficulty === 'normal') {
    // 유저가 가장 많이 낸 손을 카운트
    const counts: Record<Choice, number> = { rock: 0, paper: 0, scissors: 0 };
    for (const c of history) counts[c]++;
    const most = ALL.reduce((a, b) => (counts[a] >= counts[b] ? a : b));
    const counter = BEATS[most];

    // 40% 확률로 카운터, 나머지 60%는 랜덤
    const weights: Record<Choice, number> = { rock: 1, paper: 1, scissors: 1 };
    weights[counter] += 3; // 총 6 중 4 → ~40% for counter
    return weightedPick(weights);
  }

  // hard: 마르코프 체인 — 직전 손 → 다음 손 전이 확률 기반 예측
  const transitions: Record<Choice, Record<Choice, number>> = {
    rock: { rock: 0, paper: 0, scissors: 0 },
    paper: { rock: 0, paper: 0, scissors: 0 },
    scissors: { rock: 0, paper: 0, scissors: 0 },
  };

  for (let i = 0; i < history.length - 1; i++) {
    transitions[history[i]][history[i + 1]]++;
  }

  const last = history[history.length - 1];
  const row = transitions[last];
  const total = row.rock + row.paper + row.scissors;

  if (total === 0) return randomChoice();

  // 가장 높은 전이 확률을 가진 손을 예측
  const predicted = ALL.reduce((a, b) => (row[a] >= row[b] ? a : b));
  const counter = BEATS[predicted];

  // 70% 확률로 카운터, 30%는 랜덤
  if (Math.random() < 0.7) return counter;
  return randomChoice();
}
