'use client';
import { supabase, type GameMode, type Slot } from './supabase';

export async function createRoom(
  mode: GameMode,
  hostId: string,
  nickname: string
): Promise<string> {
  const { data, error } = await supabase.rpc('create_room', {
    p_mode: mode,
    p_host_id: hostId,
    p_nickname: nickname.trim(),
  });
  if (error) throw error;
  return data as string;
}

export async function joinRoom(
  roomId: string,
  playerId: string,
  nickname: string
): Promise<Slot> {
  const { data, error } = await supabase.rpc('join_room', {
    p_room_id: roomId,
    p_player_id: playerId,
    p_nickname: nickname.trim(),
  });
  if (error) throw error;
  return data as Slot;
}

export async function startMatch(roomId: string, playerId: string): Promise<void> {
  const { error } = await supabase.rpc('start_match', {
    p_room_id: roomId,
    p_player_id: playerId,
  });
  if (error) throw error;
}

export async function submitChoice(
  roomId: string,
  playerId: string,
  round: number,
  choice: 'rock' | 'paper' | 'scissors'
): Promise<void> {
  const { error } = await supabase.rpc('submit_choice', {
    p_room_id: roomId,
    p_player_id: playerId,
    p_round: round,
    p_choice: choice,
  });
  if (error) throw error;
}

export async function rematch(roomId: string, playerId: string): Promise<void> {
  const { error } = await supabase.rpc('rematch', {
    p_room_id: roomId,
    p_player_id: playerId,
  });
  if (error) throw error;
}

export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_room', {
    p_room_id: roomId,
    p_player_id: playerId,
  });
  if (error) throw error;
}
