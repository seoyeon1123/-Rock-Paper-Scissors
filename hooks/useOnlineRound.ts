'use client';
import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PlayerRow, RoomRow, RoundRow, Slot } from '@/lib/supabase';
import { isValidChoice, judge, randomChoice, type Choice, type Result } from '@/lib/gameLogic';
import type { Gesture } from '@/lib/gestureRecognition';
import { submitChoice } from '@/lib/room';

export type OnlinePhase = 'waiting' | 'countdown' | 'committed' | 'reveal';

export interface OnlineRoundSnapshot {
  phase: OnlinePhase;
  countdown: number;
  myChoice: Choice | null;
  oppChoice: Choice | null;
  result: Result | null;
  revealRound: number | null;
  opponentReady: boolean;
  myReady: boolean;
  missedReveal: boolean;
}

interface Args {
  roomId: string;
  playerId: string;
  mySlot: Slot | null;
  channel: RealtimeChannel | null;
  room: RoomRow | null;
  roundsByNumber: Record<number, RoundRow>;
  ready: boolean;
  handDetected: boolean;
  getGesture: () => Gesture;
  onCountdownTick?: (value: number) => void;
}

const COUNTDOWN_START = 2;
const REVEAL_HOLD_MS = 400;

interface RevealSnapshot {
  round: number;
  myChoice: Choice | null;
  oppChoice: Choice | null;
  result: Result | null;
}

/**
 * 온라인 라운드 상태 머신 (commit-reveal + countdown 동기화)
 *
 * 흐름:
 *  1. 양쪽이 valid 제스처 500ms 유지 → broadcast('ready', {round, slot})
 *  2. 양쪽 ready 확인 시 slot=1 이 broadcast('go', {round}) 를 보냄
 *  3. 'go' 수신 → phase='countdown', 3→2→1→0
 *  4. 0 에서 getGesture() 캡처 → submit_choice RPC → phase='committed'
 *  5. 서버가 rounds[N].revealed_at 세팅 + room.current_round++ (atomic)
 *  6. 클라가 해당 라운드가 revealed 된 걸 감지 → phase='reveal', 2초 표시
 *  7. 2초 후 phase='waiting' 으로 리셋 → 다음 라운드 진입
 *
 * 카운트다운 중 제스처가 invalid 하면 랜덤 선택으로 auto-submit (데드락 방지).
 */
export function useOnlineRound({
  roomId,
  playerId,
  mySlot,
  channel,
  room,
  roundsByNumber,
  ready,
  handDetected,
  getGesture,
  onCountdownTick,
}: Args): OnlineRoundSnapshot {
  const [phase, setPhase] = useState<OnlinePhase>('waiting');
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [myReadyRound, setMyReadyRound] = useState<number | null>(null);
  const [oppReadyRound, setOppReadyRound] = useState<number | null>(null);
  const [submittedRound, setSubmittedRound] = useState<number | null>(null);
  const [missedReveal, setMissedReveal] = useState(false);
  const [reveal, setReveal] = useState<RevealSnapshot | null>(null);

  // 리프레시된 콜백을 listener에서 읽기 위한 ref
  const getGestureRef = useRef(getGesture);
  getGestureRef.current = getGesture;
  const onCountdownTickRef = useRef(onCountdownTick);
  onCountdownTickRef.current = onCountdownTick;
  const stateRef = useRef({ mySlot, room, phase });
  stateRef.current = { mySlot, room, phase };

  const prevRoundsRef = useRef<Record<number, RoundRow>>({});

  // ─── 이전 라운드의 reveal 감지 (어느 라운드든 revealed_at 이 새로 세팅되면 snapshot) ───
  useEffect(() => {
    const prev = prevRoundsRef.current;
    for (const [numStr, row] of Object.entries(roundsByNumber)) {
      const num = Number(numStr);
      const prevRow = prev[num];
      const justRevealed = row.revealed_at && !prevRow?.revealed_at;
      if (!justRevealed) continue;
      if (mySlot == null) continue;
      if (reveal?.round === num) continue;
      const mine = (mySlot === 1 ? row.p1_choice : row.p2_choice) as Choice | null;
      const opp = (mySlot === 1 ? row.p2_choice : row.p1_choice) as Choice | null;
      const result: Result | null =
        mine && opp ? judge(mine, opp) : null;
      setReveal({ round: num, myChoice: mine, oppChoice: opp, result });
      setPhase('reveal');
    }
    prevRoundsRef.current = roundsByNumber;
  }, [roundsByNumber, mySlot, reveal]);

  // ─── reveal 2초 뒤 waiting 으로 복귀 ───
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => {
      setReveal(null);
      setPhase('waiting');
      setMyReadyRound(null);
      setOppReadyRound(null);
      setSubmittedRound(null);
      setMissedReveal(false);
      setCountdown(COUNTDOWN_START);
    }, 2000);
    return () => clearTimeout(t);
  }, [phase]);

  // ─── 브로드캐스트 리스너 (채널이 준비됐을 때 1회 등록) ───
  useEffect(() => {
    if (!channel) return;
    channel.on('broadcast', { event: 'ready' }, (evt: any) => {
      const payload = evt.payload as { round: number; slot: Slot };
      if (!payload) return;
      if (stateRef.current.mySlot != null && payload.slot === stateRef.current.mySlot) return;
      setOppReadyRound(payload.round);
    });
    channel.on('broadcast', { event: 'go' }, (evt: any) => {
      const payload = evt.payload as { round: number };
      if (!payload) return;
      const s = stateRef.current;
      if (!s.room || s.room.current_round !== payload.round) return;
      if (s.phase !== 'waiting') return;
      setPhase('countdown');
      setCountdown(COUNTDOWN_START);
    });
    // supabase-js v2 는 specific broadcast listener 를 offset 할 방법이 없음.
    // channel 자체가 unmount 시 제거되므로 실제 누수는 없음.
  }, [channel]);

  // ─── 손이 프레임에 보이면 500ms 유지 → broadcast('ready') ───
  // 유효 제스처를 기다리지 않음. 주먹 쥔 채로 대기하다 "보!" 에 내는 흐름 지원.
  useEffect(() => {
    if (phase !== 'waiting') return;
    if (!channel || !room || mySlot == null) return;
    if (room.status !== 'playing') return;
    if (!ready) return;
    if (!handDetected) return;
    const num = room.current_round;
    if (myReadyRound === num) return;

    const t = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'ready',
        payload: { round: num, slot: mySlot },
      });
      setMyReadyRound(num);
    }, 500);
    return () => clearTimeout(t);
  }, [phase, ready, handDetected, myReadyRound, room, mySlot, channel]);

  // ─── 양쪽 ready 확인 → slot=1 이 'go' 브로드캐스트 + 로컬 카운트다운 시작 ───
  useEffect(() => {
    if (phase !== 'waiting') return;
    if (!channel || !room) return;
    const num = room.current_round;
    if (myReadyRound !== num || oppReadyRound !== num) return;
    if (mySlot !== 1) return; // deterministic initiator

    channel.send({
      type: 'broadcast',
      event: 'go',
      payload: { round: num },
    });
    setPhase('countdown');
    setCountdown(COUNTDOWN_START);
  }, [phase, myReadyRound, oppReadyRound, room, mySlot, channel]);

  // ─── 카운트다운 틱 + reveal 제출 ───
  // countdown=0 일 때 "보!" 를 REVEAL_HOLD_MS 동안 보여준 뒤 제스처를 캡처.
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (!room) return;
    if (countdown === 0) {
      onCountdownTickRef.current?.(0);
      const t = setTimeout(() => {
        const g = getGestureRef.current();
        const choice: Choice = isValidChoice(g) ? g : randomChoice();
        if (!isValidChoice(g)) setMissedReveal(true);
        const num = room.current_round;
        setSubmittedRound(num);
        setPhase('committed');
        submitChoice(roomId, playerId, num, choice).catch(() => {
          // 서버 에러는 무시 (재시도는 구현 안 함)
        });
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(t);
    }
    onCountdownTickRef.current?.(countdown);
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, room, roomId, playerId]);

  return {
    phase,
    countdown,
    myChoice: reveal?.myChoice ?? null,
    oppChoice: reveal?.oppChoice ?? null,
    result: reveal?.result ?? null,
    revealRound: reveal?.round ?? null,
    opponentReady: oppReadyRound === (room?.current_round ?? -1),
    myReady: myReadyRound === (room?.current_round ?? -1),
    missedReveal,
  };
}
