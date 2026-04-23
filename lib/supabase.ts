'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase 환경변수가 없습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.'
  );
}

export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 20 } },
});

export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type GameMode = 'bo3' | 'bo5' | 'infinite';
export type Slot = 1 | 2;

export interface RoomRow {
  id: string;
  mode: GameMode;
  status: RoomStatus;
  current_round: number;
  host_id: string;
  match_result: 'p1' | 'p2' | 'draw' | null;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  nickname: string;
  slot: Slot;
  score: number;
  connected: boolean;
}

export interface RoundRow {
  room_id: string;
  round_number: number;
  p1_choice: 'rock' | 'paper' | 'scissors' | null;
  p2_choice: 'rock' | 'paper' | 'scissors' | null;
  revealed_at: string | null;
}
