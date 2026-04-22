// MediaPipe Hands returns 21 landmarks per detected hand, each with x/y/z
// in normalized image coordinates (0..1). y=0 is the top of the image.
//
// Each finger has 4 landmarks along its length:
//   MCP (base, where it meets the palm) → PIP → DIP → TIP (fingertip).
// The thumb uses CMC → MCP → IP → TIP because of its different anatomy.
//
// Indices (see https://developers.google.com/mediapipe/solutions/vision/hand_landmarker):
//   0:  WRIST
//   1-4:   THUMB  (CMC, MCP, IP, TIP)
//   5-8:   INDEX  (MCP, PIP, DIP, TIP)
//   9-12:  MIDDLE (MCP, PIP, DIP, TIP)
//   13-16: RING
//   17-20: PINKY
//
// How we decide "is this finger extended?"
//
// - index / middle / ring / pinky:
//     Compare TIP.y vs PIP.y. If TIP is higher on screen (smaller y) than PIP,
//     the finger is pointing up → extended. If TIP is below PIP, the finger
//     has curled back down into the palm. This assumes the palm faces the
//     camera and the hand is roughly upright, which is the natural pose for
//     showing rock/paper/scissors.
//
// - thumb:
//     The thumb swings sideways, not up/down, so a y-comparison doesn't work.
//     We compare TIP.x vs IP.x instead. For a right hand with palm toward the
//     camera, an extended thumb points away from the other fingers — i.e.,
//     to the right of IP (TIP.x > IP.x). A left hand mirrors that, so we
//     flip the comparison based on MediaPipe's reported handedness.
//
// Gesture mapping:
// - rock (주먹):     index/middle/ring/pinky all curled. We intentionally IGNORE
//                    the thumb here because "fist with thumb tucked" vs "fist
//                    with thumb on top" both read as rock to humans, but the
//                    thumb landmark is unreliable at many camera angles.
// - paper (보):      4 or more fingers extended. Tolerant of thumb flicker.
// - scissors (가위): exactly index + middle extended, ring + pinky curled.
//                    Thumb position is not part of the rule.

export type Landmark = { x: number; y: number; z: number };
export type Gesture = 'rock' | 'paper' | 'scissors' | 'unknown';

const TIP = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 } as const;
const PIP = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 } as const;

export type FingerStates = {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
};

export function getFingerStates(
  landmarks: Landmark[],
  handedness: 'Left' | 'Right' = 'Right'
): FingerStates {
  const yExtended = (tip: number, pip: number) => landmarks[tip].y < landmarks[pip].y;

  const thumb =
    handedness === 'Right'
      ? landmarks[TIP.thumb].x > landmarks[PIP.thumb].x
      : landmarks[TIP.thumb].x < landmarks[PIP.thumb].x;

  return {
    thumb,
    index: yExtended(TIP.index, PIP.index),
    middle: yExtended(TIP.middle, PIP.middle),
    ring: yExtended(TIP.ring, PIP.ring),
    pinky: yExtended(TIP.pinky, PIP.pinky),
  };
}

export function recognizeGesture(
  landmarks: Landmark[] | undefined,
  handedness: 'Left' | 'Right' = 'Right'
): Gesture {
  if (!landmarks || landmarks.length < 21) return 'unknown';

  const f = getFingerStates(landmarks, handedness);
  const extended = +f.thumb + +f.index + +f.middle + +f.ring + +f.pinky;

  if (!f.index && !f.middle && !f.ring && !f.pinky) return 'rock';
  if (extended >= 4) return 'paper';
  if (f.index && f.middle && !f.ring && !f.pinky) return 'scissors';
  return 'unknown';
}
