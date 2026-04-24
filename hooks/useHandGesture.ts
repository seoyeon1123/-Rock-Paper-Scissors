'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { recognizeGesture, type Gesture } from '@/lib/gestureRecognition';

type Status = { ready: boolean; error: string | null };

/**
 * Owns the webcam stream and MediaPipe Hands inference loop.
 *
 * Performance design:
 * - The latest gesture is stored in a ref (gestureRef). Updated every frame
 *   with NO re-render. Consumers read it on demand via getGesture() —
 *   e.g. at the moment the countdown ends, we want the exact current value.
 * - A throttled `displayGesture` state (~100ms) drives UI that shows the
 *   live recognition. setState on every frame would re-render consumers
 *   30+ times per second, which is wasted work.
 * - Frame pump uses requestAnimationFrame gated by a `busy` flag so we
 *   never queue a second inference while one is still in flight. On slow
 *   devices this prevents backpressure and keeps the video smooth.
 */
const GESTURE_BUFFER = 7;

export function useHandGesture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gestureRef = useRef<Gesture>('unknown');
  const handDetectedRef = useRef(false);
  const bufferRef = useRef<Gesture[]>([]);
  const [displayGesture, setDisplayGesture] = useState<Gesture>('unknown');
  const [handDetected, setHandDetected] = useState(false);
  const [status, setStatus] = useState<Status>({ ready: false, error: null });
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localStream: MediaStream | null = null;
    let hands: any = null;
    let busy = false;
    let lastUiUpdate = 0;

    (async () => {
      try {
        // "ideal" (not "exact") keeps desktop webcams working even when they
        // don't expose facingMode. On mobile it nudges the browser toward the
        // front/selfie camera, which is what rock-paper-scissors needs.
        localStream = await navigator.mediaDevices
          .getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: { ideal: 'user' },
            },
            audio: false,
          })
          .catch(async (err: DOMException) => {
            if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
              return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
            throw err;
          });
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = localStream;
        await video.play();
        setStream(localStream);

        // Dynamic import keeps MediaPipe (which touches `window`) out of SSR.
        const { Hands } = await import('@mediapipe/hands');
        if (cancelled) return;

        hands = new Hands({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });
        hands.onResults((results: any) => {
          const lm = results.multiHandLandmarks?.[0];
          const handed = (results.multiHandedness?.[0]?.label ?? 'Right') as
            | 'Left'
            | 'Right';
          const g: Gesture = lm ? recognizeGesture(lm, handed) : 'unknown';
          const detected = !!lm;

          gestureRef.current = g;
          handDetectedRef.current = detected;
          const buf = bufferRef.current;
          buf.push(g);
          if (buf.length > GESTURE_BUFFER) buf.shift();

          const now = performance.now();
          if (now - lastUiUpdate > 100) {
            lastUiUpdate = now;
            setDisplayGesture((prev) => (prev === g ? prev : g));
            setHandDetected((prev) => (prev === detected ? prev : detected));
          }
        });

        setStatus({ ready: true, error: null });

        const tick = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (!busy && v && v.readyState >= 2) {
            busy = true;
            try {
              await hands.send({ image: v });
            } catch {
              // swallow single-frame inference errors
            } finally {
              busy = false;
            }
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch (e: any) {
        if (!cancelled) {
          setStatus({ ready: false, error: e?.message ?? 'init failed' });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      localStream?.getTracks().forEach((t) => t.stop());
      try {
        hands?.close?.();
      } catch {}
      bufferRef.current = [];
      setStream(null);
    };
  }, []);

  // "보!" 순간에 플레이어가 막 낸 손을 읽어야 하므로 최근 프레임을 우선.
  // - 최근 3프레임에서 유효 제스처가 2개 이상 일치하면 그걸로 확정 (빠른 리빌 대응)
  // - 그게 안 되면 최근 전체 버퍼의 과반 제스처로 폴백 (단일 프레임 노이즈 방어)
  // - 둘 다 아니면 즉시값 반환
  const getGesture = useCallback((): Gesture => {
    const buf = bufferRef.current;
    if (buf.length === 0) return gestureRef.current;

    const tail = buf.slice(-3);
    const tailCounts: Record<Gesture, number> = {
      rock: 0,
      paper: 0,
      scissors: 0,
      unknown: 0,
    };
    for (const g of tail) tailCounts[g]++;
    for (const g of ['rock', 'paper', 'scissors'] as const) {
      if (tailCounts[g] >= 2) return g;
    }

    const counts: Record<Gesture, number> = {
      rock: 0,
      paper: 0,
      scissors: 0,
      unknown: 0,
    };
    for (const g of buf) counts[g]++;
    for (const g of ['rock', 'paper', 'scissors'] as const) {
      if (counts[g] * 2 >= buf.length) return g;
    }
    return gestureRef.current;
  }, []);

  return {
    videoRef,
    displayGesture,
    handDetected,
    getGesture,
    stream,
    ...status,
  };
}
