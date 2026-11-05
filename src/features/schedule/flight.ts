// [시작]을 눌렀을 때 유인원이 날아가는 궤적(포물선) 계산. 순수 함수라 따로 검사할 수 있다.
// power(0~1): 시작 마감(5분) 중 얼마나 일찍 눌렀는지(1 - 진행률). 일찍 누를수록 세게(높이·옆으로·회전·크기) 날아간다.
// 각도는 매번 무작위(위쪽 반원 안). 사용자 요청: 너무 빨라서 안 보였음 → 느린 중력·속도 상한으로
// 화면 안에서 1.6~3.6초 동안 보이다가 아래로 떨어져 나간다.

export type Flight = {
  // 시작점 기준 이동(픽셀)을 시간 0~1 구간에 나눠 둔 표본
  times: number[];
  xs: number[];
  ys: number[];
  // 전체 회전(도). 부호 = 방향
  spinDeg: number;
  durationMs: number;
};

// 전체 속도 비율(사용자 요청: 빨리 누르면 너무 빨라서 안 보임). 1 = 이전 속도. 0.6이면 같은 궤적을 1/0.6배 오래 본다.
// 속도는 비율만큼, 중력은 비율의 제곱만큼 줄여야 궤적 모양(높이·거리)이 그대로이고 시간만 길어진다. 값은 Estimate.
const TIME_SCALE = 0.6;
const GRAVITY = 900 * TIME_SCALE * TIME_SCALE; // px/s² (예전 2200: 너무 빨리 떨어졌다)
const MIN_SPEED = 380 * TIME_SCALE; // 마감 직전에 시작: 살짝 튀었다 떨어짐
const MAX_SPEED = 1200 * TIME_SCALE; // 시작 시각 직후(또는 미리) 시작: 높이·멀리
const TOP_MARGIN = 60; // 가장 높이 올라가도 화면 위 끝에서 이만큼은 남긴다(화면 밖으로 사라지지 않게)
const CROSS_SECONDS = 2.6 / TIME_SCALE; // 옆으로는 화면 폭을 이 시간보다 빨리 가로지르지 않는다(옆으로 금방 사라지지 않게)
const MIN_SECONDS = 1.6 / TIME_SCALE;
const MAX_SECONDS = 3.6 / TIME_SCALE;
const SAMPLES = 32;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const planFlight = (
  power: number,
  screen: { width: number; height: number },
  start: { x: number; y: number },
  random: () => number = Math.random,
): Flight => {
  const p = clamp01(power);
  const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * p * p;
  // 약할 때는 거의 위로(좌우 ±25°), 셀수록 넓게(±55°)
  const spread = (25 + 30 * p) * (Math.PI / 180);
  const angle = -Math.PI / 2 + (random() * 2 - 1) * spread;

  // 위로: 꼭대기가 화면 위 여백 아래에 머물게 줄인다. 옆으로: 너무 빨리 화면 밖으로 나가지 않게 줄인다.
  const maxUp = Math.sqrt(2 * GRAVITY * Math.max(40, start.y - TOP_MARGIN));
  const maxSide = screen.width / CROSS_SECONDS;
  const vy = Math.max(-maxUp, Math.sin(angle) * speed);
  const vx = Math.max(-maxSide, Math.min(maxSide, Math.cos(angle) * speed));

  // 화면 아래(+100px)로 떨어질 때까지
  const drop = screen.height + 100 - start.y;
  const fallOut = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * drop)) / GRAVITY;
  const seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, fallOut));

  const times: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = (i / SAMPLES) * seconds;
    times.push(i / SAMPLES);
    xs.push(vx * t);
    ys.push(vy * t + 0.5 * GRAVITY * t * t);
  }

  const direction = random() < 0.5 ? -1 : 1;
  const turns = 1 + 4 * p + random();
  return {
    times,
    xs,
    ys,
    spinDeg: direction * turns * 360,
    durationMs: Math.round(seconds * 1000),
  };
};
