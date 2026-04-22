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
export function useHandGesture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gestureRef = useRef<Gesture>('unknown');
  const [displayGesture, setDisplayGesture] = useState<Gesture>('unknown');
  const [status, setStatus] = useState<Status>({ ready: false, error: null });

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let hands: any = null;
    let busy = false;
    let lastUiUpdate = 0;

    (async () => {
      try {
        // Constraints are "ideal", not "exact" — so a mismatched webcam still
        // negotiates the closest supported resolution instead of throwing
        // NotFoundError. `facingMode` is dropped because desktop webcams
        // don't expose it and requiring it rejects the device outright.
        stream = await navigator.mediaDevices
          .getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          })
          .catch(async (err: DOMException) => {
            // Fallback: try the most permissive request possible.
            if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
              return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
            throw err;
          });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

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

          gestureRef.current = g;

          const now = performance.now();
          if (now - lastUiUpdate > 100) {
            lastUiUpdate = now;
            // Functional update + equality guard: React bails out when the
            // returned value is identical to the previous state.
            setDisplayGesture((prev) => (prev === g ? prev : g));
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
      stream?.getTracks().forEach((t) => t.stop());
      try {
        hands?.close?.();
      } catch {}
    };
  }, []);

  const getGesture = useCallback(() => gestureRef.current, []);

  return { videoRef, displayGesture, getGesture, ...status };
}
