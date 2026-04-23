/**
 * Web Audio API 기반 사운드 — 외부 파일 없이 합성음만 사용.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playCountdownTick() {
  playTone(800, 0.1, 'square', 0.15);
}

export function playCountdownGo() {
  playTone(1200, 0.15, 'square', 0.2);
}

export function playWin() {
  const c = getCtx();
  const now = c.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.3);
  });
}

export function playLose() {
  const c = getCtx();
  const now = c.currentTime;
  [400, 300].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.2);
    osc.stop(now + i * 0.2 + 0.3);
  });
}

export function playDraw() {
  playTone(500, 0.2, 'triangle', 0.15);
}

export function playStreak() {
  const c = getCtx();
  const now = c.currentTime;
  [660, 880, 1100, 1320].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.2);
  });
}

export function playVictory() {
  const c = getCtx();
  const now = c.currentTime;
  [523, 523, 659, 784, 784, 659, 784, 1047].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.25);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.25);
  });
}
