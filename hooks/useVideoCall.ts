'use client';
import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Slot } from '@/lib/supabase';

export interface VideoCallDiag {
  signaling: RTCSignalingState;
  iceConn: RTCIceConnectionState;
  iceGathering: RTCIceGatheringState;
  hasRemoteDesc: boolean;
  offerSent: number;
  answerRecv: number;
  iceRecv: number;
}

interface Args {
  channel: RealtimeChannel | null;
  localStream: MediaStream | null;
  mySlot: Slot | null;
}

type SignalPayload =
  | { kind: 'offer'; sdp: RTCSessionDescriptionInit; from: Slot }
  | { kind: 'answer'; sdp: RTCSessionDescriptionInit; from: Slot }
  | { kind: 'ice'; candidate: RTCIceCandidateInit; from: Slot }
  | { kind: 'hello'; from: Slot };

/**
 * 1:1 WebRTC 영상 통화. 기존 Supabase Realtime 채널을 시그널링 버스로 재사용.
 *
 * - slot=1 이 offer 를 생성하는 initiator. slot=2 는 offer 수신 후 answer.
 * - 구독 타이밍 불일치 대비: slot=2 가 'hello' 를 먼저 쏴서 slot=1 이 offer 를 (재)송신하도록 유도.
 * - 양쪽 모두 ICE candidate 를 broadcast.
 * - pending ICE 는 큐에 담아뒀다가 remoteDescription 이 생긴 뒤 적용 (race 방지).
 */
export function useVideoCall({ channel, localStream, mySlot }: Args) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>('new');
  const [diag, setDiag] = useState<VideoCallDiag>({
    signaling: 'stable',
    iceConn: 'new',
    iceGathering: 'new',
    hasRemoteDesc: false,
    offerSent: 0,
    answerRecv: 0,
    iceRecv: 0,
  });

  useEffect(() => {
    if (!channel || !localStream || mySlot == null) return;

    let closed = false;
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    });

    const isInitiator = mySlot === 1;
    const pendingIce: RTCIceCandidateInit[] = [];
    const counters = { offerSent: 0, answerRecv: 0, iceRecv: 0 };

    const pushDiag = () => {
      if (closed) return;
      setDiag({
        signaling: pc.signalingState,
        iceConn: pc.iceConnectionState,
        iceGathering: pc.iceGatheringState,
        hasRemoteDesc: !!pc.remoteDescription,
        ...counters,
      });
    };

    console.debug('[videoCall] init', { mySlot, isInitiator });

    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    pc.ontrack = (e) => {
      if (closed) return;
      const s = e.streams[0];
      console.debug('[videoCall] ontrack', { kind: e.track.kind, streamId: s?.id });
      if (s) setRemoteStream(s);
    };

    pc.onicecandidate = (e) => {
      if (closed || !e.candidate) return;
      channel.send({
        type: 'broadcast',
        event: 'webrtc',
        payload: {
          kind: 'ice',
          candidate: e.candidate.toJSON(),
          from: mySlot,
        } satisfies SignalPayload,
      });
    };

    pc.onconnectionstatechange = () => {
      if (closed) return;
      console.debug('[videoCall] connectionState', pc.connectionState);
      setConnectionState(pc.connectionState);
      pushDiag();
    };
    pc.oniceconnectionstatechange = () => {
      console.debug('[videoCall] iceConnectionState', pc.iceConnectionState);
      pushDiag();
    };
    pc.onicegatheringstatechange = () => {
      console.debug('[videoCall] iceGatheringState', pc.iceGatheringState);
      pushDiag();
    };
    pc.onsignalingstatechange = () => {
      console.debug('[videoCall] signalingState', pc.signalingState);
      pushDiag();
    };

    const applyPendingIce = async () => {
      while (pendingIce.length > 0) {
        const c = pendingIce.shift();
        if (c) {
          try {
            await pc.addIceCandidate(c);
          } catch {}
        }
      }
    };

    // localDescription 을 한 번만 만들고, 재송신 시에는 기존 SDP 를 그대로 다시 보냄.
    // createOffer 를 반복하면 signalingState 가 꼬일 수 있음.
    const sendOffer = async () => {
      if (closed) return;
      if (pc.remoteDescription) return; // 이미 answer 받음
      try {
        if (!pc.localDescription) {
          const offer = await pc.createOffer();
          if (closed) return;
          await pc.setLocalDescription(offer);
        }
        if (closed || !pc.localDescription) return;
        counters.offerSent++;
        console.debug('[videoCall] send offer #', counters.offerSent);
        channel.send({
          type: 'broadcast',
          event: 'webrtc',
          payload: {
            kind: 'offer',
            sdp: pc.localDescription.toJSON() as RTCSessionDescriptionInit,
            from: mySlot,
          } satisfies SignalPayload,
        });
        pushDiag();
      } catch (err) {
        console.warn('[videoCall] sendOffer failed', err);
      }
    };

    channel.on('broadcast', { event: 'webrtc' }, async (evt: any) => {
      if (closed) return;
      const p = evt.payload as SignalPayload | undefined;
      if (!p || p.from === mySlot) return;
      console.debug('[videoCall] recv', p.kind, 'from slot', p.from);

      if (p.kind === 'hello') {
        if (isInitiator) sendOffer();
        return;
      }
      if (p.kind === 'offer') {
        if (isInitiator) return; // initiator ignores offers
        try {
          if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
            return;
          }
          await pc.setRemoteDescription(p.sdp);
          await applyPendingIce();
          const answer = await pc.createAnswer();
          if (closed) return;
          await pc.setLocalDescription(answer);
          if (closed || !pc.localDescription) return;
          channel.send({
            type: 'broadcast',
            event: 'webrtc',
            payload: {
              kind: 'answer',
              sdp: pc.localDescription.toJSON() as RTCSessionDescriptionInit,
              from: mySlot,
            } satisfies SignalPayload,
          });
        } catch {}
        return;
      }
      if (p.kind === 'answer') {
        if (!isInitiator) return;
        counters.answerRecv++;
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(p.sdp);
            await applyPendingIce();
          }
        } catch (err) {
          console.warn('[videoCall] answer failed', err);
        }
        pushDiag();
        return;
      }
      if (p.kind === 'ice') {
        counters.iceRecv++;
        if (!pc.remoteDescription) {
          pendingIce.push(p.candidate);
          pushDiag();
          return;
        }
        try {
          await pc.addIceCandidate(p.candidate);
        } catch {}
        pushDiag();
        return;
      }
    });

    let retryTimer: number | undefined;
    const helloTimers: number[] = [];

    if (isInitiator) {
      // answer 받을 때까지 2초 간격으로 계속 재송신. 상대 listener 가 늦게
      // 붙어도 결국 따라잡도록.
      let attempts = 0;
      const MAX = 10;
      const tryOffer = async () => {
        if (closed) return;
        if (pc.remoteDescription) return;
        if (attempts >= MAX) return;
        attempts++;
        await sendOffer();
        retryTimer = window.setTimeout(tryOffer, 2000);
      };
      tryOffer();
    } else {
      // initiator 가 내 listener 등록 전에 offer 를 보냈을 수 있으니
      // 'hello' 를 몇 차례 반복해서 다시 offer 를 끌어옴.
      const sendHello = () => {
        if (closed) return;
        channel.send({
          type: 'broadcast',
          event: 'webrtc',
          payload: { kind: 'hello', from: mySlot } satisfies SignalPayload,
        });
      };
      sendHello();
      helloTimers.push(window.setTimeout(sendHello, 1500));
      helloTimers.push(window.setTimeout(sendHello, 4000));
    }

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      helloTimers.forEach(clearTimeout);
      try {
        pc.getSenders().forEach((s) => {
          try {
            pc.removeTrack(s);
          } catch {}
        });
      } catch {}
      pc.close();
      setRemoteStream(null);
      setConnectionState('closed');
    };
  }, [channel, localStream, mySlot]);

  return { remoteStream, connectionState, diag };
}
