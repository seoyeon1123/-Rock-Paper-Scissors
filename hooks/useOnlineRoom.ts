'use client';
import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  supabase,
  type PlayerRow,
  type RoomRow,
  type RoundRow,
  type Slot,
} from '@/lib/supabase';
import { joinRoom, leaveRoom } from '@/lib/room';
import { getOrCreatePlayerId, getNicknameCache } from '@/lib/playerId';

type Status = 'loading' | 'not-found' | 'need-nickname' | 'ready' | 'error';

export interface OnlineRoomState {
  status: Status;
  error: string | null;
  room: RoomRow | null;
  players: PlayerRow[];
  roundsByNumber: Record<number, RoundRow>;
  currentRound: RoundRow | null;
  mySlot: Slot | null;
  isHost: boolean;
  channel: RealtimeChannel | null;
  playerId: string;
  join: (nickname: string) => Promise<void>;
  leave: () => Promise<void>;
}

/**
 * 한 방에 대한 realtime 구독 + 멤버십 관리.
 *
 * - rooms/players/rounds 테이블의 postgres_changes 구독 → 로컬 state 갱신
 * - channel은 state로 노출돼서 useOnlineRound가 broadcast 리스너를 붙일 수 있음
 * - rounds는 맵으로 보관 → 방금 공개된 라운드의 snapshot을 놓치지 않기 위함
 */
export function useOnlineRoom(roomId: string): OnlineRoomState {
  const [playerId] = useState(() => getOrCreatePlayerId());
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [roundsByNumber, setRoundsByNumber] = useState<Record<number, RoundRow>>(
    {}
  );
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const mySlot = (players.find((p) => p.id === playerId)?.slot as Slot) ?? null;
  const isHost = room?.host_id === playerId;
  const currentRound = room ? roundsByNumber[room.current_round] ?? null : null;

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    (async () => {
      const [
        { data: roomData, error: roomErr },
        { data: playerData },
        { data: roundsData },
      ] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
        supabase.from('players').select('*').eq('room_id', roomId),
        supabase.from('rounds').select('*').eq('room_id', roomId),
      ]);

      if (cancelled) return;

      if (roomErr) {
        setStatus('error');
        setError(roomErr.message);
        return;
      }
      if (!roomData) {
        setStatus('not-found');
        return;
      }

      setRoom(roomData as RoomRow);
      setPlayers((playerData ?? []) as PlayerRow[]);
      const map: Record<number, RoundRow> = {};
      (roundsData ?? []).forEach((r: any) => {
        map[r.round_number] = r as RoundRow;
      });
      setRoundsByNumber(map);

      const joined = (playerData ?? []).some((p: any) => p.id === playerId);
      setStatus(joined ? 'ready' : 'need-nickname');

      const ch = supabase
        .channel(`room:${roomId}`, {
          config: { presence: { key: playerId } },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`,
          },
          (payload) => {
            if (payload.eventType === 'DELETE') setRoom(null);
            else setRoom(payload.new as RoomRow);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            setPlayers((prev) => {
              if (payload.eventType === 'DELETE') {
                return prev.filter((p) => p.id !== (payload.old as any).id);
              }
              const row = payload.new as PlayerRow;
              const idx = prev.findIndex((p) => p.id === row.id);
              if (idx === -1) return [...prev, row];
              const next = [...prev];
              next[idx] = row;
              return next;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rounds',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            if (payload.eventType === 'DELETE') {
              const num = (payload.old as any).round_number as number;
              setRoundsByNumber((prev) => {
                if (!(num in prev)) return prev;
                const next = { ...prev };
                delete next[num];
                return next;
              });
              return;
            }
            const row = payload.new as RoundRow;
            setRoundsByNumber((prev) => ({ ...prev, [row.round_number]: row }));
          }
        );

      await ch.subscribe(async (s) => {
        if (s === 'SUBSCRIBED') {
          try {
            await ch.track({ playerId, nickname: getNicknameCache() });
          } catch {}
        }
      });

      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      setChannel(ch);
    })();

    return () => {
      cancelled = true;
      setChannel((ch) => {
        if (ch) supabase.removeChannel(ch);
        return null;
      });
    };
  }, [roomId, playerId]);

  const join = useCallback(
    async (nickname: string) => {
      try {
        await joinRoom(roomId, playerId, nickname);
        setStatus('ready');
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? '참여 실패');
        throw e;
      }
    },
    [roomId, playerId]
  );

  const leave = useCallback(async () => {
    try {
      await leaveRoom(roomId, playerId);
    } catch {}
  }, [roomId, playerId]);

  return {
    status,
    error,
    room,
    players,
    roundsByNumber,
    currentRound,
    mySlot,
    isHost,
    channel,
    playerId,
    join,
    leave,
  };
}
