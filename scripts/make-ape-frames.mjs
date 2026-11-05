// 원래 유인원 아이콘(assets/icons/logo-ape-black.png) 그림 그대로를 구부려서 4족 보행 프레임 그림 묶음을 굽는다.
// 프로젝트 루트에서: node scripts/make-ape-frames.mjs   (pngjs 필요: node_modules에 이미 있음)
//
// 왜 이렇게: 조각을 잘라 돌리면 관절에서 조각 모서리가 튀어나오고 틈이 생긴다(사용자 지적). 그래서 아이콘 그림 전체를
// 촘촘한 그물(mesh)로 덮고, 그물 꼭짓점마다 "몸 / 팔다리 마디"의 영향 비율(가중치)을 부드럽게 줘서 관절 둘레가
// 자연스럽게 굽도록 한다(스키닝). 그림은 원본 실루엣의 픽셀을 그대로 끌어다 쓰므로 쉬는 자세는 아이콘과 똑같다.
//  1) 팔다리(뒷다리 2개, 팔) 영역을 폴리곤으로 정하고 가장자리를 흐려 몸과 부드럽게 이어 준다.
//  2) 팔다리 안에서는 [윗마디 · 아랫마디 · 발(손)] 세 구간의 비율을 관절 근처에서 부드럽게 바꾼다.
//  3) 걸음 주기를 프레임마다 계산한다: 딛는 발은 땅에서 미끄러지지 않고 뒤로 밀리며, 드는 발은 호를 그리며 앞으로 간다.
//  4) 발목 위치로 두 마디 관절 계산(IK)을 풀어 무릎·팔꿈치를 구부리고, 몸은 걸음에 맞춰 출렁이며 살짝 기운다.
//  5) 그물 삼각형을 원본 그림에서 무늬를 읽어 그린다. 반대편 팔(몸 뒤)은 같은 팔을 한 번 더 그려 합친다.
// 결과: assets/ape/ape-frames.png(프레임 묶음 한 장) + src/features/schedule/apeFrames.ts(칸 크기·세트 정보).
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

// ── 원본 그림 읽기 ──
const srcPng = PNG.sync.read(fs.readFileSync('assets/icons/logo-ape-black.png'));
const SW = srcPng.width;
const SH = srcPng.height;
let hasAlpha = false;
for (let i = 3; i < srcPng.data.length; i += 4) if (srcPng.data[i] < 250) { hasAlpha = true; break; }
const srcAlpha = new Float32Array(SW * SH);
for (let i = 0; i < srcAlpha.length; i += 1) {
  srcAlpha[i] = hasAlpha ? srcPng.data[i * 4 + 3] / 255 : (255 - srcPng.data[i * 4]) / 255;
}

// 걸음 중 팔다리가 움직이는 범위까지 포함해 넉넉히 자른다(원본 좌표).
const CROP = { x: 170, y: 260, w: 880, h: 770 };
const OUT_SCALE = 0.38;
const SS = 2; // 2배로 그려서 반으로 줄인다(가장자리 부드럽게)
const CELL_W = Math.round(CROP.w * OUT_SCALE);
const CELL_H = Math.round(CROP.h * OUT_SCALE);
const GAP = 2;
const COLS = 7;
// 아이콘 몸 그림 상자(앱에서 폭을 맞출 기준): 원본 그림이 실제로 차지하는 영역
const BOX = { x: 282, y: 328, w: 972 - 282, h: 977 - 328 };

const cw = CROP.w;
const ch = CROP.h;
const tex = new Float32Array(cw * ch);
for (let y = 0; y < ch; y += 1) for (let x = 0; x < cw; x += 1) tex[y * cw + x] = srcAlpha[(y + CROP.y) * SW + (x + CROP.x)];

const sampleTex = (u, v) => {
  // u, v: 자른 그림 안 좌표(픽셀 중심 기준 아님). 쌍선형 보간.
  const x = u - 0.5;
  const y = v - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= cw || yy >= ch ? 0 : tex[yy * cw + xx]);
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy
  );
};

// ── 팔다리 영역(원본 좌표) ──
// 관절 사슬: root(몸에 붙은 곳) → knee(무릎·팔꿈치) → ankle(발목·손목) → toe(발끝·손끝)
const LIMBS = [
  {
    name: 'hindBack', // 왼쪽(뒤) 뒷다리: 발이 뒤로 뻗어 있다
    poly: [[260, 735], [560, 725], [560, 1000], [260, 1000]],
    pivot: [465, 725], radius: 58,
    chain: [[458, 705], [520, 785], [300, 880], [408, 968]],
  },
  {
    name: 'hindFront', // 배 아래 가운데 뒷다리
    poly: [[560, 725], [598, 652], [742, 652], [792, 800], [800, 1000], [560, 1000]],
    pivot: [655, 690], radius: 55,
    chain: [[650, 682], [705, 765], [630, 945], [752, 965]],
  },
  {
    name: 'arm', // 팔
    poly: [[742, 652], [752, 622], [1000, 600], [1000, 1000], [800, 1000], [792, 800]],
    pivot: [812, 640], radius: 62,
    chain: [[830, 610], [795, 728], [945, 868], [925, 955]],
  },
];
const NL = LIMBS.length;

const inPoly = (px, py, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// 영역 표시(0 = 몸, 1~3 = 팔다리) → 흐려서 부드러운 비율로
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
const BLEND_R = 16; // 몸과 팔다리가 섞이는 폭(원본 픽셀)
const limbW = LIMBS.map((_, l) => {
  let a = new Float32Array(cw * ch);
  for (let i = 0; i < a.length; i += 1) a[i] = label[i] === l + 1 ? 1 : 0;
  for (let k = 0; k < 3; k += 1) a = boxBlur(a, BLEND_R);
  return a;
});
const hardArm = new Float32Array(cw * ch);
for (let i = 0; i < hardArm.length; i += 1) hardArm[i] = label[i] === 3 ? 1 : 0;

// ── 팔다리 안에서 마디 비율(관절 둘레를 부드럽게) ──
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const JOINT_HALF = 30; // 관절 둘레 섞이는 반 폭(원본 픽셀)
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

// 꼭짓점(그물 교점)마다 가중치를 미리 계산한다.
const STEP = 4;
const gx = Math.floor(cw / STEP) + 1;
const gy = Math.floor(ch / STEP) + 1;
const NB = 1 + NL * 3; // 뼈 개수: 몸 1 + 팔다리마다 3
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
    vertW[base] = Math.max(0, 1 - sumLimb);
  }
}

// ── 걸음걸이 ──
const CENTER = [640, 650]; // 몸이 기우는 중심
// 팔다리 걸음 중심 이동(걸음 폭의 가운데가 쉬는 자세에서 얼마나 앞뒤인지)
const CENTER_SHIFT = { hindBack: 28, hindFront: 0, arm: -22 };
const SETS = [
  {
    name: 'walk', u: 0.1, frames: 16,
    // 옆걸음 4박: 뒷다리 → 같은 쪽 팔 → 반대 뒷다리 → 반대 팔
    phase: { hindBack: 0, arm: 0.25, hindFront: 0.5, farArm: 0.75 },
    beta: 0.64,
    stride: { hindBack: 96, hindFront: 82, arm: 100, farArm: 100 },
    lift: { hindBack: 40, hindFront: 36, arm: 44, farArm: 44 },
    bob: 7, bobFreq: 2, bobPhase: 0.15, pitch: 1.3,
  },
  {
    name: 'trot', u: 0.6, frames: 12,
    // 종종걸음: 대각선 두 다리가 짝
    phase: { hindBack: 0, farArm: 0, hindFront: 0.5, arm: 0.5 },
    beta: 0.5,
    stride: { hindBack: 96, hindFront: 80, arm: 104, farArm: 104 },
    lift: { hindBack: 52, hindFront: 46, arm: 56, farArm: 56 },
    bob: 16, bobFreq: 2, bobPhase: 0.0, pitch: 2.4,
  },
  {
    name: 'gallop', u: 1, frames: 12,
    // 바운드: 뒷다리 둘이 함께, 앞팔 둘이 함께
    phase: { hindBack: 0, hindFront: 0.04, arm: 0.5, farArm: 0.52 },
    beta: 0.4,
    stride: { hindBack: 118, hindFront: 100, arm: 124, farArm: 124 },
    lift: { hindBack: 70, hindFront: 62, arm: 76, farArm: 76 },
    bob: 34, bobFreq: 1, bobPhase: 0.25, pitch: 4.2,
  },
];

const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// 발(주먹) 위치: p는 이 팔다리의 걸음 위상(0~1)
const footOffset = (p, beta, stride, lift, shift) => {
  if (p < beta) {
    const s = p / beta;
    return { dx: stride * (0.5 - s) + shift, dy: 0, swing: -1 };
  }
  const s = (p - beta) / (1 - beta);
  const eased = s * s * (3 - 2 * s);
  return { dx: stride * (-0.5 + eased) + shift, dy: -lift * Math.sin(Math.PI * s), swing: s };
};

// 한 팔다리의 자세(뼈 변환 세 개)를 구한다. rootWorld는 몸 변환이 적용된 어깨·엉덩이 위치.
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

// 한 프레임의 뼈 변환 묶음을 만든다. shift = 반대편 팔 같은 복사본의 x 이동.
const buildPose = (set, c, farArm) => {
  const bobWave = 0.5 * (1 + Math.cos(2 * Math.PI * (set.bobFreq * c + set.bobPhase)));
  const bobY = -set.bob * bobWave; // 위로 뜨는 쪽만
  const pitch = ((set.pitch * Math.sin(2 * Math.PI * (set.bobFreq * c + set.bobPhase + 0.25))) * Math.PI) / 180;
  const shiftX = farArm ? -34 : 0;
  const body = (x, y) => {
    const [rx, ry] = rot(pitch, x - CENTER[0], y - CENTER[1]);
    return [CENTER[0] + rx + shiftX, CENTER[1] + ry + bobY];
  };
  const limbs = LIMBS.map((L, l) => {
    const key = l === 2 && farArm ? 'farArm' : L.name;
    const p = (((c - set.phase[key]) % 1) + 1) % 1;
    const f = footOffset(p, set.beta, set.stride[key], set.lift[key], CENTER_SHIFT[L.name]);
    const rootWorld = body(L.chain[0][0], L.chain[0][1]);
    const restAnkle = L.chain[2];
    const ankleWorld = [restAnkle[0] + f.dx + shiftX, restAnkle[1] + f.dy];
    const footAngle = f.swing >= 0 ? -0.42 * Math.sin(Math.PI * f.swing) : 0;
    return solveLimb(l, rootWorld, ankleWorld, footAngle);
  });
  return { body, limbs };
};

// ── 그물 그리기 ──
const OW = CELL_W * SS;
const OH = CELL_H * SS;
const toOut = (x, y) => [(x - CROP.x) * OUT_SCALE * SS, (y - CROP.y) * OUT_SCALE * SS];

const renderFrame = (pose, onlyArm, buf) => {
  // 꼭짓점 위치 계산
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
  // 삼각형 그리기
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
        let alpha = sampleTex(u + 0.5, v + 0.5);
        if (onlyArm) alpha *= Math.min(1, Math.max(0, sampleHard(u, v)));
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
      if (onlyArm) {
        const u = Math.min(cw - 1, i * STEP);
        const v = Math.min(ch - 1, j * STEP);
        if (hardArm[v * cw + u] < 0.5 && hardArm[Math.min(ch - 1, v + STEP) * cw + Math.min(cw - 1, u + STEP)] < 0.5) continue;
      }
      tri(a, b, c);
      tri(b, d, c);
    }
  }
};
const sampleHard = (u, v) => {
  const x = Math.min(cw - 1, Math.max(0, Math.round(u)));
  const y = Math.min(ch - 1, Math.max(0, Math.round(v)));
  return hardArm[y * cw + x];
};

const frameCell = (pose, farPose) => {
  const buf = new Float32Array(OW * OH);
  renderFrame(farPose, true, buf); // 몸 뒤의 반대편 팔
  renderFrame(pose, false, buf);
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

// ── 프레임 모으기: 세트들 + 마지막에 쉬는 자세(원본 그대로) ──
const cells = [];
const setInfo = [];
for (const set of SETS) {
  setInfo.push({ name: set.name, u: set.u, start: cells.length, count: set.frames });
  for (let f = 0; f < set.frames; f += 1) {
    const c = f / set.frames;
    cells.push(frameCell(buildPose(set, c, false), buildPose(set, c, true)));
  }
  console.log('set', set.name, 'done');
}
// 쉬는 자세: 원본 아이콘 그대로(뼈 변환 없음)
{
  const identity = {
    body: (x, y) => [x, y],
    limbs: LIMBS.map((L) => ({
      R0: L.chain[0], K: L.chain[1], A: L.chain[2], th0: 0, th1: 0, th2: 0,
    })),
  };
  const farHidden = { body: (x, y) => [x - 34, y], limbs: identity.limbs.map((m) => ({ ...m, R0: [m.R0[0] - 34, m.R0[1]], K: [m.K[0] - 34, m.K[1]], A: [m.A[0] - 34, m.A[1]] })) };
  cells.push(frameCell(identity, farHidden));
}
const restIndex = cells.length - 1;

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
fs.writeFileSync('assets/ape/ape-frames.png', PNG.sync.write(sheet, { colorType: 6 }));

const baseW = Math.round(BOX.w * OUT_SCALE);
const baseH = Math.round(BOX.h * OUT_SCALE);
const mx = Math.round((BOX.x - CROP.x) * OUT_SCALE);
const mt = Math.round((BOX.y - CROP.y) * OUT_SCALE);
const ts = `// scripts/make-ape-frames.mjs가 만든 값이다. 직접 고치지 말고 스크립트를 다시 돌린다.
// 프레임 묶음 assets/ape/ape-frames.png: 칸 크기·여백·세트 정보. 그림은 원래 유인원 아이콘(logo-ape-black.png)을 구부려 만든다.
export const APE_FRAMES = {
  cols: ${COLS},
  // 한 칸 크기(픽셀)와 칸 사이 빈 줄
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
  // 세트 순서 = 묶음 안 순서. u = 그 세트를 만들 때의 걸음 세기, start = 첫 칸 번호, count = 칸 수
  sets: ${JSON.stringify(setInfo)},
} as const;
`;
fs.writeFileSync('src/features/schedule/apeFrames.ts', ts);
console.log('frames', cells.length, 'sheet', sheetW, 'x', sheetH);

// 잘림 점검: 모든 프레임에서 그림이 칸 가장자리에서 얼마나 떨어져 있는지(작으면 칸 모서리에 잘릴 수 있다).
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
