// 현대인 아이콘(assets/icons/stage-1-human.png) 그림 그대로를 구부려서 "걷기"와 "발차기" 프레임 그림 묶음을 굽는다.
// 프로젝트 루트에서: node scripts/make-human-frames.mjs   (pngjs 필요: node_modules에 이미 있음)
// 방식은 scripts/make-ape-frames.mjs와 같다(그물 + 팔다리 마디 가중치 스키닝 + 두 마디 IK). 사람은 다리 둘·팔 둘을 구부린다.
//   walk  : 한 걸음 주기(두 발짝) 16칸. 계획표 진행 바 위를 걷는 사람.
//   kick  : 발차기 14칸. 서 있다가 앞발을 뒤로 젖혔다가 앞으로 걷어찬다(닿는 순간 = contact 칸).
//   rest  : 원본 아이콘 그대로(1칸)
// 결과: assets/human/human-frames.png + src/features/schedule/humanFrames.ts
// 디버그: node scripts/make-human-frames.mjs --debug  → 관절·영역 그림과 프레임 모음(콘솔에 경로)
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const DEBUG = process.argv.includes('--debug');

// ── 원본 그림 읽기 ──
const srcPng = PNG.sync.read(fs.readFileSync('assets/icons/stage-1-human.png'));
const SW = srcPng.width;
const SH = srcPng.height;
let hasAlpha = false;
for (let i = 3; i < srcPng.data.length; i += 4) if (srcPng.data[i] < 250) { hasAlpha = true; break; }
const srcAlpha = new Float32Array(SW * SH);
for (let i = 0; i < srcAlpha.length; i += 1) {
  srcAlpha[i] = hasAlpha ? srcPng.data[i * 4 + 3] / 255 : (255 - srcPng.data[i * 4]) / 255;
}

// 걸음·발차기 중 팔다리가 움직이는 범위까지 포함해 넉넉히 자른다(원본 좌표).
const CROP = { x: 0, y: 0, w: 1330, h: 1210 };
const OUT_SCALE = 0.2;
const SS = 3; // 3배로 그려서 줄인다(가장자리 부드럽게)
const CELL_W = Math.round(CROP.w * OUT_SCALE);
const CELL_H = Math.round(CROP.h * OUT_SCALE);
const GAP = 2;
const COLS = 8;
// 아이콘 몸 그림 상자(앱에서 크기를 맞출 기준): 원본 그림이 실제로 차지하는 영역
const BOX = { x: 339, y: 65, w: 995 - 339, h: 1173 - 65 };

const cw = CROP.w;
const ch = CROP.h;
const tex = new Float32Array(cw * ch);
for (let y = 0; y < ch; y += 1) for (let x = 0; x < cw; x += 1) tex[y * cw + x] = srcAlpha[(y + CROP.y) * SW + (x + CROP.x)];

const sampleTex = (u, v) => {
  const x = u - 0.5;
  const y = v - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= cw || yy >= ch ? 0 : tex[yy * cw + xx]);
  return at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy;
};

// ── 팔다리 영역(원본 좌표, 눈금 그림으로 읽은 값) ──
// 관절 사슬: root(몸에 붙은 곳) → knee(무릎·팔꿈치) → ankle(발목·손목) → toe(발끝·주먹)
const LIMBS = [
  {
    name: 'legBack', // 뒤로 뻗은 왼쪽 다리
    poly: [[330, 745], [648, 752], [640, 1200], [330, 1200]],
    pivot: [600, 705], radius: 52,
    chain: [[600, 700], [555, 855], [420, 1075], [480, 1150]],
  },
  {
    name: 'legFront', // 앞으로 뻗은 오른쪽 다리
    poly: [[648, 752], [700, 690], [840, 690], [1040, 1200], [648, 1200]],
    pivot: [700, 710], radius: 52,
    chain: [[695, 705], [765, 838], [840, 1085], [950, 1130]],
  },
  {
    name: 'armBack', // 뒤로 늘어뜨린 팔
    poly: [[400, 340], [545, 340], [576, 445], [592, 545], [545, 570], [505, 650], [505, 740], [400, 740]],
    pivot: [548, 385], radius: 42,
    chain: [[548, 385], [497, 530], [478, 632], [452, 698]],
  },
  {
    name: 'armFront', // 앞으로 나온 팔(아래팔)
    poly: [[724, 470], [760, 500], [900, 580], [905, 670], [850, 670], [790, 620], [722, 612], [714, 560]],
    pivot: [714, 508], radius: 36,
    chain: [[714, 506], [778, 548], [848, 594], [886, 630]],
  },
];
const NL = LIMBS.length;
const IDX = { legBack: 0, legFront: 1, armBack: 2, armFront: 3 };

const inPoly = (px, py, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const label = new Uint8Array(cw * ch);
for (let y = 0; y < ch; y += 1) {
  for (let x = 0; x < cw; x += 1) {
    const X = x + CROP.x;
    const Y = y + CROP.y;
    for (let l = 0; l < NL; l += 1) {
      const L = LIMBS[l];
      const inCircle = (X - L.pivot[0]) ** 2 + (Y - L.pivot[1]) ** 2 <= L.radius ** 2;
      if (inPoly(X, Y, L.poly) || inCircle) label[y * cw + x] = l + 1;
    }
  }
}

const boxBlur = (src, radius) => {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const size = radius * 2 + 1;
  for (let y = 0; y < ch; y += 1) {
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) sum += src[y * cw + Math.min(cw - 1, Math.max(0, x))];
    for (let x = 0; x < cw; x += 1) {
      tmp[y * cw + x] = sum / size;
      sum += src[y * cw + Math.min(cw - 1, x + radius + 1)] - src[y * cw + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < cw; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) sum += tmp[Math.min(ch - 1, Math.max(0, y)) * cw + x];
    for (let y = 0; y < ch; y += 1) {
      out[y * cw + x] = sum / size;
      sum += tmp[Math.min(ch - 1, y + radius + 1) * cw + x] - tmp[Math.max(0, y - radius) * cw + x];
    }
  }
  return out;
};
const BLEND_R = 14; // 몸과 팔다리가 섞이는 폭(원본 픽셀)
const limbW = LIMBS.map((_, l) => {
  let a = new Float32Array(cw * ch);
  for (let i = 0; i < a.length; i += 1) a[i] = label[i] === l + 1 ? 1 : 0;
  for (let k = 0; k < 3; k += 1) a = boxBlur(a, BLEND_R);
  return a;
});

// ── 팔다리 안에서 마디 비율(관절 둘레를 부드럽게) ──
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const JOINT_HALF = 26;
const chainInfo = LIMBS.map((L) => {
  const segs = [];
  let acc = 0;
  for (let i = 0; i < 3; i += 1) {
    const [x0, y0] = L.chain[i];
    const [x1, y1] = L.chain[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    segs.push({ x0, y0, dx: x1 - x0, dy: y1 - y0, len, start: acc });
    acc += len;
  }
  return { segs, a1: segs[1].start, a2: segs[2].start };
});

const STEP = 4;
const gx = Math.floor(cw / STEP) + 1;
const gy = Math.floor(ch / STEP) + 1;
const NB = 1 + NL * 3;
const vertW = new Float32Array(gx * gy * NB);
for (let j = 0; j < gy; j += 1) {
  for (let i = 0; i < gx; i += 1) {
    const x = Math.min(cw - 1, i * STEP);
    const y = Math.min(ch - 1, j * STEP);
    const base = (j * gx + i) * NB;
    let sumLimb = 0;
    for (let l = 0; l < NL; l += 1) {
      const w = limbW[l][y * cw + x];
      if (w <= 0.0005) continue;
      sumLimb += w;
      const X = x + CROP.x;
      const Y = y + CROP.y;
      const info = chainInfo[l];
      let best = 1e18;
      let arc = 0;
      for (const s of info.segs) {
        const t = Math.min(1, Math.max(0, ((X - s.x0) * s.dx + (Y - s.y0) * s.dy) / (s.len * s.len)));
        const px = s.x0 + s.dx * t;
        const py = s.y0 + s.dy * t;
        const d = (X - px) ** 2 + (Y - py) ** 2;
        if (d < best) {
          best = d;
          arc = s.start + t * s.len;
        }
      }
      const w0 = 1 - smooth(info.a1 - JOINT_HALF, info.a1 + JOINT_HALF, arc);
      const w2 = smooth(info.a2 - JOINT_HALF, info.a2 + JOINT_HALF, arc);
      const w1 = Math.max(0, 1 - w0 - w2);
      vertW[base + 1 + l * 3] = w * w0;
      vertW[base + 2 + l * 3] = w * w1;
      vertW[base + 3 + l * 3] = w * w2;
    }
    // 합이 1을 넘으면 줄인다(다리 둘이 겹치는 가랑이 둘레)
    if (sumLimb > 1) for (let k = 1; k < NB; k += 1) vertW[base + k] /= sumLimb;
    vertW[base] = Math.max(0, 1 - Math.min(1, sumLimb));
  }
}

const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// 한 팔다리의 자세(뼈 변환 세 개)
const solveLimb = (l, rootWorld, ankleWorld, footAngle) => {
  const [J0, J1, J2] = LIMBS[l].chain;
  const L1 = Math.hypot(J1[0] - J0[0], J1[1] - J0[1]);
  const L2 = Math.hypot(J2[0] - J1[0], J2[1] - J1[1]);
  let dx = ankleWorld[0] - rootWorld[0];
  let dy = ankleWorld[1] - rootWorld[1];
  let d = Math.hypot(dx, dy);
  const maxR = L1 + L2 - 1;
  const minR = Math.abs(L1 - L2) + 1;
  if (d > maxR) { dx *= maxR / d; dy *= maxR / d; d = maxR; }
  if (d < minR) { const k = minR / Math.max(d, 1e-6); dx *= k; dy *= k; d = minR; }
  const A = [rootWorld[0] + dx, rootWorld[1] + dy];
  const cosA = Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const alpha = Math.acos(cosA);
  const base = Math.atan2(dy, dx);
  const restCross = (J1[0] - J0[0]) * (J2[1] - J1[1]) - (J1[1] - J0[1]) * (J2[0] - J1[0]);
  let K = null;
  for (const sgn of [1, -1]) {
    const a = base + sgn * alpha;
    const kk = [rootWorld[0] + L1 * Math.cos(a), rootWorld[1] + L1 * Math.sin(a)];
    const cross = (kk[0] - rootWorld[0]) * (A[1] - kk[1]) - (kk[1] - rootWorld[1]) * (A[0] - kk[0]);
    if (cross * restCross >= 0) { K = kk; break; }
  }
  if (K === null) K = [rootWorld[0] + L1 * Math.cos(base + alpha), rootWorld[1] + L1 * Math.sin(base + alpha)];
  const th0 = Math.atan2(K[1] - rootWorld[1], K[0] - rootWorld[0]) - Math.atan2(J1[1] - J0[1], J1[0] - J0[0]);
  const th1 = Math.atan2(A[1] - K[1], A[0] - K[0]) - Math.atan2(J2[1] - J1[1], J2[0] - J1[0]);
  return { R0: rootWorld, K, A, th0, th1, th2: footAngle };
};

const CENTER = [650, 700]; // 몸이 기우는 중심(엉덩이)
const GROUND = { legBack: LIMBS[0].chain[2][1], legFront: LIMBS[1].chain[2][1] };

// 목표(발목·손목)를 만들어 한 프레임의 자세를 푼다.
// target(name) → { dx, dy, angle }: dx = 뿌리(엉덩이·어깨) 기준 가로, y = 세계 좌표 세로(발: 땅 기준 들어올림)
const posedBody = (bobY, pitchDeg, targets) => {
  const pitch = (pitchDeg * Math.PI) / 180;
  const body = (x, y) => {
    const [rx, ry] = rot(pitch, x - CENTER[0], y - CENTER[1]);
    return [CENTER[0] + rx, CENTER[1] + ry + bobY];
  };
  const limbs = LIMBS.map((L, l) => {
    const t = targets[L.name];
    const rootWorld = body(L.chain[0][0], L.chain[0][1]);
    const ankleWorld = [rootWorld[0] + t.dx, t.y];
    return solveLimb(l, rootWorld, ankleWorld, t.angle);
  });
  return { body, limbs };
};

const smoothstep = (a, b, x) => smooth(a, b, x);
const lerp = (a, b, t) => a + (b - a) * t;

// ── 걷기 / 달리기 ──
// 발 하나의 걸음: p(0~1) 위상. 딛는 동안(0~beta) 발은 땅에 붙어 뒤로 밀리고(뒤꿈치 닿기 → 평평 → 뒤꿈치 들기),
// 드는 동안(beta~1) 발목이 호를 그리며 앞으로 간다(발끝이 아래로 → 위로).
// 반환: x(−amp~+amp), lift(땅에서 발목까지), angle(발 각도, +는 발끝이 아래)
const legGait = (p, g) => {
  if (p < g.beta) {
    const s = p / g.beta;
    let angle = 0;
    let lift = 0;
    if (s < 0.15) angle = -0.2 * (1 - s / 0.15); // 뒤꿈치 닿기: 발끝이 살짝 위
    if (s > 0.78) {
      const k = (s - 0.78) / 0.22; // 뒤꿈치 들기: 발끝으로 밀어냄
      angle = g.toeOff * k;
      lift = g.heel * k;
    }
    return { x: g.amp * (1 - 2 * s), lift, angle };
  }
  const s = (p - g.beta) / (1 - g.beta);
  const e = s * s * (3 - 2 * s);
  const lift = g.heel * (1 - s) + g.lift * Math.pow(Math.sin(Math.PI * s), g.liftPow ?? 1);
  const angle = s < 0.3 ? g.toeOff * (1 - s / 0.3) : -0.2 * smoothstep(0.5, 1, s);
  return { x: g.amp * (-1 + 2 * e), lift, angle };
};
const armAt = (l, dxExtra, dyExtra) => ({
  dx: LIMBS[l].chain[2][0] - LIMBS[l].chain[0][0] + dxExtra,
  y: LIMBS[l].chain[2][1] + dyExtra,
  angle: 0,
});
const gaitPose = (c, g) => {
  // 앞다리 위상 0 → 맨 앞에서 시작, 뒷다리는 반 박자 뒤
  const f = legGait(c % 1, g);
  const b = legGait((c + 0.5) % 1, g);
  const bobY = g.bobFn(c);
  // 팔은 반대 다리와 엇갈린다: 앞 팔은 앞다리가 앞일 때 앞으로, 뒤 팔은 뒷다리가 앞일 때 앞으로
  return posedBody(bobY, g.pitch, {
    legFront: { dx: f.x, y: GROUND.legFront - f.lift, angle: f.angle },
    legBack: { dx: b.x, y: GROUND.legBack - b.lift, angle: b.angle },
    armFront: armAt(3, (f.x / g.amp) * g.armAmp, 4 - g.armLift),
    armBack: armAt(2, (b.x / g.amp) * g.armAmp, -g.armLift * 0.6),
  });
};
const WALK = {
  frames: 24,
  beta: 0.62, amp: 130, heel: 18, lift: 40, liftPow: 1.0, toeOff: 0.32,
  // 몸은 두 발이 땅에 있을 때 가장 낮고(발끝이 먼 때), 한 발로 서 있을 때 가장 높다(다리가 거의 곧게 펴진다)
  bobFn: (c) => -13 + 22 * Math.cos(4 * Math.PI * c),
  pitch: 1.5, armAmp: 62, armLift: 0,
};

// ── 발차기 ──
const KICK_FRAMES = 14;
const KICK_CONTACT = 0.5; // 발이 닿는 순간(0~1)
// 키프레임(발목 = 엉덩이 기준 가로 dx, 땅에서 들어올린 높이 lift, 발 각도, 몸 기울기, 팔)
const KICK_KEYS = [
  { t: 0.0, dx: 20, lift: 0, ang: 0, pitch: 0, armF: 0, armB: 0 },
  { t: 0.3, dx: -215, lift: 150, ang: 0.3, pitch: 6, armF: 30, armB: -20 }, // 뒤로 젖힘(몸은 살짝 앞으로 숙임)
  { t: 0.5, dx: 330, lift: 170, ang: -0.2, pitch: -9, armF: -55, armB: 55 }, // 걷어차는 순간(몸은 뒤로)
  { t: 0.72, dx: 220, lift: 110, ang: -0.1, pitch: -4, armF: -20, armB: 25 },
  { t: 1.0, dx: 20, lift: 0, ang: 0, pitch: 0, armF: 0, armB: 0 },
];
const keyAt = (t) => {
  let i = 0;
  while (i < KICK_KEYS.length - 2 && t > KICK_KEYS[i + 1].t) i += 1;
  const a = KICK_KEYS[i];
  const b = KICK_KEYS[i + 1];
  const u = smoothstep(a.t, b.t, t);
  const out = {};
  for (const k of ['dx', 'lift', 'ang', 'pitch', 'armF', 'armB']) out[k] = lerp(a[k], b[k], u);
  return out;
};
const kickPose = (t) => {
  const k = keyAt(t);
  return posedBody(0, k.pitch, {
    legFront: { dx: k.dx, y: GROUND.legFront - k.lift, angle: k.ang },
    // 받치는 다리는 서 있는다
    legBack: { dx: -40, y: GROUND.legBack, angle: 0 },
    armFront: { dx: LIMBS[3].chain[2][0] - LIMBS[3].chain[0][0] + k.armF, y: LIMBS[3].chain[2][1], angle: 0 },
    armBack: { dx: LIMBS[2].chain[2][0] - LIMBS[2].chain[0][0] + k.armB, y: LIMBS[2].chain[2][1], angle: 0 },
  });
};

// ── 슈퍼맨 비행 / 착지 ──
const FLY_PITCH = 82; // 몸을 눕히는 각도(머리가 오른쪽으로)
const FLY_FRAMES = 8;
const TILT_FRAMES = 6;
const posedFree = (pitchDeg, targetFn) => {
  const pitch = (pitchDeg * Math.PI) / 180;
  const body = (x, y) => {
    const [rx, ry] = rot(pitch, x - CENTER[0], y - CENTER[1]);
    return [CENTER[0] + rx, CENTER[1] + ry];
  };
  const limbs = LIMBS.map((L, l) => {
    const root = body(L.chain[0][0], L.chain[0][1]);
    const t = targetFn(L.name, root, body);
    return solveLimb(l, root, t.pos, t.angle);
  });
  return { body, limbs };
};
const limbReach = (l) => {
  const [J0, J1, J2] = LIMBS[l].chain;
  return Math.hypot(J1[0] - J0[0], J1[1] - J0[1]) + Math.hypot(J2[0] - J1[0], J2[1] - J1[1]);
};
const toeAngle = (l) => {
  const [, , J2, J3] = LIMBS[l].chain;
  return Math.atan2(J3[1] - J2[1], J3[0] - J2[0]);
};
// te: 0 = 날고 있음, 1 = 서 있음. c: 다리가 파닥이는 위상(0~1)
const flightPose = (te, c) => {
  const pitchDeg = FLY_PITCH * (1 - te);
  const a = (pitchDeg * Math.PI) / 180;
  const down = [-Math.sin(a), Math.cos(a)];
  const fwd = [-down[0], -down[1]];
  const perp = [down[1], -down[0]];
  return posedFree(pitchDeg, (name, root, body) => {
    const l = IDX[name];
    const reach = limbReach(l);
    if (name === 'legFront' || name === 'legBack') {
      const sign = name === 'legFront' ? 1 : -1;
      const flutter = 14 * Math.sin(2 * Math.PI * c) * sign;
      const fly = [root[0] + 0.97 * reach * down[0] + perp[0] * flutter, root[1] + 0.97 * reach * down[1] + perp[1] * flutter];
      const stand = [root[0] + (name === 'legFront' ? 20 : -40), GROUND[name]];
      // 발이 뒤쪽을 향하게(다리 방향으로 쭉 뻗은 발)
      const flyAngle = Math.atan2(down[1], down[0]) - toeAngle(l);
      return { pos: [lerp(fly[0], stand[0], te), lerp(fly[1], stand[1], te)], angle: flyAngle * (1 - te) * 0.4 };
    }
    const rest = body(LIMBS[l].chain[2][0], LIMBS[l].chain[2][1]);
    if (name === 'armFront') {
      const fly = [root[0] + 0.93 * reach * fwd[0], root[1] + 0.93 * reach * fwd[1]];
      return { pos: [lerp(fly[0], rest[0], te), lerp(fly[1], rest[1], te)], angle: 0 };
    }
    return { pos: rest, angle: 0 };
  });
};

// ── 그물 그리기 ──
const OW = CELL_W * SS;
const OH = CELL_H * SS;
const toOut = (x, y) => [(x - CROP.x) * OUT_SCALE * SS, (y - CROP.y) * OUT_SCALE * SS];

const renderFrame = (pose, buf) => {
  const px = new Float32Array(gx * gy);
  const py = new Float32Array(gx * gy);
  for (let j = 0; j < gy; j += 1) {
    for (let i = 0; i < gx; i += 1) {
      const idx = j * gx + i;
      const rx = Math.min(cw - 1, i * STEP) + CROP.x;
      const ry = Math.min(ch - 1, j * STEP) + CROP.y;
      const base = idx * NB;
      let sx = 0;
      let sy = 0;
      const wb = vertW[base];
      if (wb > 0) {
        const [bx, by] = pose.body(rx, ry);
        sx += wb * bx;
        sy += wb * by;
      }
      for (let l = 0; l < NL; l += 1) {
        const w0 = vertW[base + 1 + l * 3];
        const w1 = vertW[base + 2 + l * 3];
        const w2 = vertW[base + 3 + l * 3];
        if (w0 + w1 + w2 <= 0) continue;
        const lm = pose.limbs[l];
        const [J0, J1, J2] = LIMBS[l].chain;
        if (w0 > 0) {
          const [ox, oy] = rot(lm.th0, rx - J0[0], ry - J0[1]);
          sx += w0 * (lm.R0[0] + ox);
          sy += w0 * (lm.R0[1] + oy);
        }
        if (w1 > 0) {
          const [ox, oy] = rot(lm.th1, rx - J1[0], ry - J1[1]);
          sx += w1 * (lm.K[0] + ox);
          sy += w1 * (lm.K[1] + oy);
        }
        if (w2 > 0) {
          const [ox, oy] = rot(lm.th2, rx - J2[0], ry - J2[1]);
          sx += w2 * (lm.A[0] + ox);
          sy += w2 * (lm.A[1] + oy);
        }
      }
      const [ox, oy] = toOut(sx, sy);
      px[idx] = ox;
      py[idx] = oy;
    }
  }
  const tri = (a, b, c) => {
    const ax = px[a], ay = py[a], bx = px[b], by = py[b], cx = px[c], cy = py[c];
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxX = Math.min(OW - 1, Math.ceil(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxY = Math.min(OH - 1, Math.ceil(Math.max(ay, by, cy)));
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-6) return;
    const ia = a % gx, ja = Math.floor(a / gx);
    const ib = b % gx, jb = Math.floor(b / gx);
    const ic = c % gx, jc = Math.floor(c / gx);
    const ua = Math.min(cw - 1, ia * STEP), va = Math.min(ch - 1, ja * STEP);
    const ub = Math.min(cw - 1, ib * STEP), vb = Math.min(ch - 1, jb * STEP);
    const uc = Math.min(cw - 1, ic * STEP), vc = Math.min(ch - 1, jc * STEP);
    const E = -0.002;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const X = x + 0.5;
        const Y = y + 0.5;
        const l1 = ((by - cy) * (X - cx) + (cx - bx) * (Y - cy)) / det;
        const l2 = ((cy - ay) * (X - cx) + (ax - cx) * (Y - cy)) / det;
        const l3 = 1 - l1 - l2;
        if (l1 < E || l2 < E || l3 < E) continue;
        const u = l1 * ua + l2 * ub + l3 * uc;
        const v = l1 * va + l2 * vb + l3 * vc;
        const alpha = sampleTex(u + 0.5, v + 0.5);
        if (alpha > buf[y * OW + x]) buf[y * OW + x] = alpha;
      }
    }
  };
  for (let j = 0; j < gy - 1; j += 1) {
    for (let i = 0; i < gx - 1; i += 1) {
      const a = j * gx + i;
      const b = a + 1;
      const c = a + gx;
      const d = c + 1;
      tri(a, b, c);
      tri(b, d, c);
    }
  }
};

const frameCell = (pose) => {
  const buf = new Float32Array(OW * OH);
  renderFrame(pose, buf);
  const cell = new Uint8Array(CELL_W * CELL_H);
  for (let y = 0; y < CELL_H; y += 1) {
    for (let x = 0; x < CELL_W; x += 1) {
      let sum = 0;
      for (let sy = 0; sy < SS; sy += 1) for (let sx = 0; sx < SS; sx += 1) sum += buf[(y * SS + sy) * OW + x * SS + sx];
      cell[y * CELL_W + x] = Math.round((sum / (SS * SS)) * 255);
    }
  }
  return cell;
};

// ── 프레임 모으기 ──
const cells = [];
const walkStart = cells.length;
for (let f = 0; f < WALK.frames; f += 1) cells.push(frameCell(gaitPose(f / WALK.frames, WALK)));
const flyStart = cells.length;
for (let f = 0; f < FLY_FRAMES; f += 1) cells.push(frameCell(flightPose(0, f / FLY_FRAMES)));
const tiltStart = cells.length;
for (let f = 0; f < TILT_FRAMES; f += 1) cells.push(frameCell(flightPose(smoothstep(0, 1, f / (TILT_FRAMES - 1)), 0)));
const kickStart = cells.length;
for (let f = 0; f < KICK_FRAMES; f += 1) cells.push(frameCell(kickPose(f / (KICK_FRAMES - 1))));
// 쉬는 자세: 원본 아이콘 그대로(뼈 변환 없음)
{
  const identity = {
    body: (x, y) => [x, y],
    limbs: LIMBS.map((L) => ({ R0: L.chain[0], K: L.chain[1], A: L.chain[2], th0: 0, th1: 0, th2: 0 })),
  };
  cells.push(frameCell(identity));
}
const restIndex = cells.length - 1;
const contactIndex = kickStart + Math.round(KICK_CONTACT * (KICK_FRAMES - 1));

// ── 시트 한 장으로 ──
const rows = Math.ceil(cells.length / COLS);
const sheetW = COLS * CELL_W + (COLS - 1) * GAP;
const sheetH = rows * CELL_H + (rows - 1) * GAP;
const sheet = new PNG({ width: sheetW, height: sheetH });
cells.forEach((cell, index) => {
  const ox = (index % COLS) * (CELL_W + GAP);
  const oy = Math.floor(index / COLS) * (CELL_H + GAP);
  for (let y = 0; y < CELL_H; y += 1) {
    for (let x = 0; x < CELL_W; x += 1) {
      const a = cell[y * CELL_W + x];
      const o = ((oy + y) * sheetW + ox + x) * 4;
      sheet.data[o] = 0;
      sheet.data[o + 1] = 0;
      sheet.data[o + 2] = 0;
      sheet.data[o + 3] = a;
    }
  }
});
fs.mkdirSync('assets/human', { recursive: true });
fs.writeFileSync('assets/human/human-frames.png', PNG.sync.write(sheet, { colorType: 6 }));

const baseW = Math.round(BOX.w * OUT_SCALE);
const baseH = Math.round(BOX.h * OUT_SCALE);
const mx = Math.round((BOX.x - CROP.x) * OUT_SCALE);
const mt = Math.round((BOX.y - CROP.y) * OUT_SCALE);
const ts = `// scripts/make-human-frames.mjs가 만든 값이다. 직접 고치지 말고 스크립트를 다시 돌린다.
// 프레임 묶음 assets/human/human-frames.png: 현대인 아이콘(stage-1-human.png)을 구부려 만든 걷기·발차기 그림.
export const HUMAN_FRAMES = {
  cols: ${COLS},
  cellW: ${CELL_W},
  cellH: ${CELL_H},
  gap: ${GAP},
  // 아이콘 몸 그림 상자(폭 ${baseW} x 높이 ${baseH}). 칸은 이 상자보다 왼쪽 mx, 위쪽 mt만큼 바깥에서 시작한다.
  baseW: ${baseW},
  baseH: ${baseH},
  mx: ${mx},
  mt: ${mt},
  sheetW: ${sheetW},
  sheetH: ${sheetH},
  // 쉬는 자세(원본 아이콘 그대로)의 칸 번호
  restIndex: ${restIndex},
  walk: { start: ${walkStart}, count: ${WALK.frames} },
  // fly = 슈퍼맨처럼 날아가는 자세(몸을 눕히고 한 팔을 앞으로, 다리는 뒤로) 반복
  fly: { start: ${flyStart}, count: ${FLY_FRAMES} },
  // tilt = 눕힌 자세 → 서는 자세로 바뀌는 칸(착지). 거꾸로 재생하면 날아오르기
  tilt: { start: ${tiltStart}, count: ${TILT_FRAMES} },
  // contact = 발이 닿는 칸 번호(묶음 안 순서)
  kick: { start: ${kickStart}, count: ${KICK_FRAMES}, contact: ${contactIndex} },
} as const;
`;
fs.writeFileSync('src/features/schedule/humanFrames.ts', ts);
console.log('frames', cells.length, 'sheet', sheetW, 'x', sheetH, 'contact', contactIndex);

{
  let minL = 1e9, minT = 1e9, minR = 1e9, minB = 1e9;
  cells.forEach((cell) => {
    for (let y = 0; y < CELL_H; y += 1) {
      for (let x = 0; x < CELL_W; x += 1) {
        if (cell[y * CELL_W + x] > 20) {
          minL = Math.min(minL, x); minR = Math.min(minR, CELL_W - 1 - x);
          minT = Math.min(minT, y); minB = Math.min(minB, CELL_H - 1 - y);
        }
      }
    }
  });
  console.log('margins(px) left', minL, 'right', minR, 'top', minT, 'bottom', minB);
}

if (DEBUG) {
  const tmp = process.env.TEMP ?? '.';
  // 회색 배경에 합성한 프레임 모음
  const prev = new PNG({ width: sheetW, height: sheetH });
  for (let i = 0; i < sheetW * sheetH; i += 1) {
    const a = sheet.data[i * 4 + 3] / 255;
    const v = Math.round(245 * (1 - a));
    prev.data[i * 4] = v; prev.data[i * 4 + 1] = v; prev.data[i * 4 + 2] = v; prev.data[i * 4 + 3] = 255;
  }
  fs.mkdirSync(`${tmp}/dbg`, { recursive: true });
  fs.writeFileSync(`${tmp}/dbg/human-sheet.png`, PNG.sync.write(prev));
  console.log('debug sheet', `${tmp}/dbg/human-sheet.png`);
}
