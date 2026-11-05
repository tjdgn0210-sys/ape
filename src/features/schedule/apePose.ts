// 진행 바 위 유인원(기존 실루엣 그림을 몸·뒷다리·앞다리·팔로 잘라 낸 것)의 걷기·뛰기 자세 계산.
// 자른 그림: assets/ape/ape-{body,backLeg,frontLeg,arm}.png (원본 logo-ape-black.png의 (260,300)-(1000,1000) 영역, 0.3배).
// 좌표는 그림 상자에 대한 비율(0~1). 수치는 모두 Estimate이고 보면서 고치기 쉽게 한곳에 모았다.

export const APE_ASPECT = 700 / 740; // 높이 / 폭
export const GROUND = 0.9686; // 발바닥 높이

type Point = readonly [number, number];

// 팔다리가 몸에 붙은 관절(돌리는 중심)과 땅에 닿는 끝점
export const JOINTS = {
  backLeg: { pivot: [0.277, 0.6071], tip: [0.162, GROUND] },
  frontLeg: { pivot: [0.5338, 0.5571], tip: [0.595, GROUND] },
  arm: { pivot: [0.7459, 0.4857], tip: [0.905, GROUND] },
} as const satisfies Record<string, { pivot: Point; tip: Point }>;

type GaitParams = {
  // 다리를 한 바퀴(앞뒤 한 번씩) 움직이는 초당 횟수
  cyclesPerSec: number;
  // 다리·팔이 앞뒤로 흔들리는 각도(도)
  legSwing: number;
  armSwing: number;
  // 몸이 앞으로 숙는 각도(도)
  lean: number;
  // 뛸 때 몸이 땅에서 뜨는 높이(그림 높이 비율, 걷기는 0)
  airborne: number;
};

// u의 마디: 0 천천히 걷기, 0.5 빠르게 걷기, 0.6 뛰기 시작(남은 5분), 1 전력 질주(남은 2분 이하)
const KNOTS: readonly { u: number; p: GaitParams }[] = [
  { u: 0, p: { cyclesPerSec: 0.7, legSwing: 14, armSwing: 12, lean: 0, airborne: 0.015 } },
  { u: 0.5, p: { cyclesPerSec: 1.1, legSwing: 18, armSwing: 16, lean: 2, airborne: 0.03 } },
  // 뛰기: 발을 디딜 때마다 통통 뜬다(사용자 요청: 통통 튀듯이). 걷기보다 훨씬 크게 뜬다.
  { u: 0.6, p: { cyclesPerSec: 1.7, legSwing: 21, armSwing: 19, lean: 6, airborne: 0.1 } },
  { u: 1, p: { cyclesPerSec: 2.4, legSwing: 25, armSwing: 23, lean: 8, airborne: 0.14 } },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const gaitParams = (u: number): GaitParams => {
  const clamped = Math.min(1, Math.max(0, u));
  let lo = KNOTS[0]!;
  for (const hi of KNOTS.slice(1)) {
    if (clamped <= hi.u) {
      const t = (clamped - lo.u) / (hi.u - lo.u);
      return {
        cyclesPerSec: lerp(lo.p.cyclesPerSec, hi.p.cyclesPerSec, t),
        legSwing: lerp(lo.p.legSwing, hi.p.legSwing, t),
        armSwing: lerp(lo.p.armSwing, hi.p.armSwing, t),
        lean: lerp(lo.p.lean, hi.p.lean, t),
        airborne: lerp(lo.p.airborne, hi.p.airborne, t),
      };
    }
    lo = hi;
  }
  return lo.p;
};

export type ApePose = {
  // 각 부분을 관절 중심으로 돌리는 각도(도, 시계 방향 +)
  backLeg: number;
  frontLeg: number;
  arm: number;
  // 몸 뒤쪽에 보이는 반대편 팔
  farArm: number;
  lean: number;
  // 전체를 아래로 옮기는 양(그림 높이 비율). 가장 낮은 발이 땅에 닿게 맞춘 값.
  shiftY: number;
};

// 끝점(발·손)을 관절 둘레로 돌렸을 때의 높이. 폭과 높이 비율이 달라서 실제 비율로 계산한다.
const tipY = (joint: { pivot: Point; tip: Point }, degrees: number) => {
  const rad = (degrees * Math.PI) / 180;
  const dx = joint.tip[0] - joint.pivot[0];
  const dy = (joint.tip[1] - joint.pivot[1]) * APE_ASPECT;
  return joint.pivot[1] + (dx * Math.sin(rad) + dy * Math.cos(rad)) / APE_ASPECT;
};

// 통통 튀는 몸의 늘어났다 찌그러지는 비율(스프라이트 그림 만들 때 쓴다). 땅에 닿을 때 납작하고 가장 높이 뜰 때 길쭉하다.
// 세기는 뜨는 높이(airborne)에 비례해서 걷기는 거의 없고 전력 질주는 크다.
export const squashOf = (phase: number, u: number) => {
  const k = Math.min(1, gaitParams(u).airborne / 0.14);
  const s = Math.abs(Math.sin(phase));
  const sy = 1 + k * (0.1 * s - 0.06);
  return { sx: 1 / Math.sqrt(sy), sy };
};

// phase: 라디안(계속 증가), u: 0~1, moving: 0이면 멈춘 자세
export const apePose = (phase: number, u: number, moving = 1): ApePose => {
  const g = gaitParams(u);
  const swing = Math.sin(phase) * moving;
  // 대각선 짝(뒷다리+팔, 앞다리+반대편 팔)이 함께 움직이는 네발 걸음
  const backLeg = g.legSwing * swing;
  const frontLeg = -g.legSwing * swing;
  const arm = g.armSwing * swing;
  const farArm = -g.armSwing * swing;
  const lowest = Math.max(
    tipY(JOINTS.backLeg, backLeg),
    tipY(JOINTS.frontLeg, frontLeg),
    tipY(JOINTS.arm, arm),
  );
  // 발을 번갈아 디딜 때마다(한 바퀴에 두 번) 통통 뜬다: 다리가 몸 아래에 모였을 때(phase 0, π) 땅에 닿고 벌어졌을 때 가장 높다.
  const lift = g.airborne * Math.abs(Math.sin(phase)) * moving;
  return { backLeg, frontLeg, arm, farArm, lean: g.lean * moving, shiftY: GROUND - lowest - lift };
};
