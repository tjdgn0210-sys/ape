// "알파메일"(현대인보다 윗단계) 아이콘을 현대인 실루엣에서 만든다. 프로젝트 루트에서: node scripts/make-alpha-icon.mjs (pngjs 필요)
// 현대인 실루엣을 조금 줄여 위에 여백을 만들고 → 상체를 키우고(근육) → 머리 위에 왕관을 띄우고 → 뒤로 펄럭이는 망토를 단다.
// 결과: assets/icons/stage-0-alpha.png (다른 단계 그림과 같은 1254x1254 검은 실루엣). 마지막 줄에 출력되는 ink 값을 stages.ts에 적는다.
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const N = 1254;
const src = PNG.sync.read(fs.readFileSync('assets/icons/stage-1-human.png'));
const A = new Float32Array(N * N);
for (let i = 0; i < N * N; i += 1) A[i] = src.data[i * 4 + 3] / 255;

const at = (arr, x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : arr[y * N + x]);
const bilinear = (arr, x, y) => {
  const fx = x - 0.5;
  const fy = y - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  return (at(arr, x0, y0) * (1 - tx) + at(arr, x0 + 1, y0) * tx) * (1 - ty) + (at(arr, x0, y0 + 1) * (1 - tx) + at(arr, x0 + 1, y0 + 1) * tx) * ty;
};

// 1) 키 큰 비율로 다시 늘인다(사용자 요청: 최대한 비율 좋고 키 크게): 가로는 살짝 줄이고, 다리를 길게(×1.1), 상체는 약간 줄여서
//    다리가 긴 8등신 느낌으로 만든다. 발을 캔버스 아래쪽에 두고 위에 왕관 자리를 남긴다.
const SX = 0.9; // 가로
const ST = 0.9; // 상체(허리 위) 세로
const SL = 1.1; // 다리(허리 아래) 세로
const WAIST = 620; // 원본에서 허리·엉덩이 높이
const SRC_BOTTOM = 1174; // 현대인 발바닥(원본 ink 아래 끝)
const OUT_BOTTOM = 1228;
const cx0 = N / 2;
const legSrc = SRC_BOTTOM - WAIST;
// 원본 y → 새 y
const yOut = (ys) => (ys >= WAIST ? OUT_BOTTOM - (SRC_BOTTOM - ys) * SL : OUT_BOTTOM - legSrc * SL - (WAIST - ys) * ST);
// 새 y → 원본 y
const ySrc = (y) => {
  const d = OUT_BOTTOM - y;
  return d <= legSrc * SL ? SRC_BOTTOM - d / SL : WAIST - (d - legSrc * SL) / ST;
};
const scaled = new Float32Array(N * N);
for (let y = 0; y < N; y += 1) {
  const sy = ySrc(y);
  for (let x = 0; x < N; x += 1) scaled[y * N + x] = bilinear(A, (x - cx0) / SX + cx0, sy);
}

// 2) 상체를 키운다: 목 아래부터 부드럽게 부풀린다(상자 흐림 + 임계값으로 바깥쪽으로 R만큼 넓힘).
const boxBlur = (arr, r) => {
  const tmp = new Float32Array(arr.length);
  const out = new Float32Array(arr.length);
  const k = 2 * r + 1;
  for (let y = 0; y < N; y += 1) {
    let sum = 0;
    for (let x = -r; x <= r; x += 1) sum += at(arr, x, y);
    for (let x = 0; x < N; x += 1) {
      tmp[y * N + x] = sum / k;
      sum += at(arr, x + r + 1, y) - at(arr, x - r, y);
    }
  }
  for (let x = 0; x < N; x += 1) {
    let sum = 0;
    for (let y = -r; y <= r; y += 1) sum += at(tmp, x, y);
    for (let y = 0; y < N; y += 1) {
      out[y * N + x] = sum / k;
      sum += at(tmp, x, y + r + 1) - at(tmp, x, y - r);
    }
  }
  return out;
};
const ramp = (arr, lo, hi) => arr.map((v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo))));
const smooth = (t) => t * t * (3 - 2 * t);

const grown = ramp(boxBlur(boxBlur(scaled, 10), 10), 0.2, 0.26);
const NECK_FROM = yOut(193);
const NECK_TO = yOut(297);
const body = new Float32Array(N * N);
for (let y = 0; y < N; y += 1) {
  // 목 아래부터 서서히 키우고, 허리 근처(NECK_TO+330)부터 서서히 원래대로 돌아와 다리는 그대로 둔다.
  const w = smooth(Math.min(1, Math.max(0, (y - NECK_FROM) / (NECK_TO - NECK_FROM)))) * (1 - smooth(Math.min(1, Math.max(0, (y - yOut(553)) / 120))));
  for (let x = 0; x < N; x += 1) body[y * N + x] = Math.max(scaled[y * N + x], w * grown[y * N + x]);
}

// 3) 머리 위치(가장 위 가로줄 근처)를 찾는다.
let headTop = 0;
find: for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) if (scaled[y * N + x] > 0.5) { headTop = y; break find; }
let hx0 = N;
let hx1 = 0;
for (let y = headTop; y < headTop + 70; y += 1) for (let x = 0; x < N; x += 1) if (scaled[y * N + x] > 0.5) { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); }
const headCx = (hx0 + hx1) / 2;
const headW = hx1 - hx0;

// 다각형(닫힌 곡선을 부드럽게 한 것)을 칠하는 도구
const catmull = (pts, steps = 10) => {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
};
const inside = (poly, x, y) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const fillPoly = (arr, poly) => {
  let x0 = N;
  let x1 = 0;
  let y0 = N;
  let y1 = 0;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const SS = 3;
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(N - 1, Math.ceil(y1)); y += 1) {
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(N - 1, Math.ceil(x1)); x += 1) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy += 1) for (let sx = 0; sx < SS; sx += 1) if (inside(poly, x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hit += 1;
      if (hit > 0) arr[y * N + x] = Math.max(arr[y * N + x], hit / (SS * SS));
    }
  }
};

const out = Float32Array.from(body);

// 4) 망토: 어깨 뒤에서 왼쪽 아래로 펄럭이는 모양(얼굴은 오른쪽을 본다). 끝은 물결 모양.
const shoulder = [headCx - headW * 0.55, headTop + headW * 1.75];
const k = 0.72;
const cape = catmull(
  [
    [shoulder[0] + 40, shoulder[1] - 30],
    [shoulder[0] - 70 * k, shoulder[1] - 36],
    [shoulder[0] - 210 * k, shoulder[1] + 20],
    [shoulder[0] - 330 * k, shoulder[1] + 140 * k],
    [shoulder[0] - 420 * k, shoulder[1] + 300 * k],
    [shoulder[0] - 370 * k, shoulder[1] + 330 * k],
    [shoulder[0] - 340 * k, shoulder[1] + 420 * k],
    [shoulder[0] - 280 * k, shoulder[1] + 375 * k],
    [shoulder[0] - 225 * k, shoulder[1] + 465 * k],
    [shoulder[0] - 165 * k, shoulder[1] + 395 * k],
    [shoulder[0] - 95 * k, shoulder[1] + 430 * k],
    [shoulder[0] - 40 * k, shoulder[1] + 320 * k],
    [shoulder[0] + 10, shoulder[1] + 200 * k],
    [shoulder[0] + 50, shoulder[1] + 80],
  ],
  10,
);
fillPoly(out, cape);

// 5) 왕관: 머리 위에 살짝 띄워서 그린다(머리와 틈을 둬서 왕관 모양이 또렷하게 보인다).
const crownW = headW * 0.96;
// 왕관은 머리 위에 얹는다: 아래쪽을 머리 윗부분에 살짝 겹치고(CROWN_SINK), 머리가 기울어진 만큼 뒤로 살짝 기울인다.
const CROWN_SINK = 34;
const CROWN_TILT = -7;
const CROWN_GAP = 0; // 왕관 아래 테두리와 머리 사이의 가는 틈(왕관이 또렷이 보이게)
const crownBottom = headTop + CROWN_SINK;
const crownH = headW * 0.7;
const left = headCx - crownW / 2;
const right = headCx + crownW / 2;
const crown = [
  [left, crownBottom],
  [left - 4, crownBottom - crownH * 0.88],
  [left + crownW * 0.24, crownBottom - crownH * 0.42],
  [headCx, crownBottom - crownH],
  [right - crownW * 0.24, crownBottom - crownH * 0.42],
  [right + 4, crownBottom - crownH * 0.88],
  [right, crownBottom],
];
const tiltAround = (pts) => {
  const c = Math.cos((CROWN_TILT * Math.PI) / 180);
  const sn = Math.sin((CROWN_TILT * Math.PI) / 180);
  return pts.map(([x, y]) => [headCx + (x - headCx) * c - (y - crownBottom) * sn, crownBottom + (x - headCx) * sn + (y - crownBottom) * c]);
};
fillPoly(out, tiltAround(crown));
// 왕관 아래 가장자리를 따라 가는 틈을 파서, 머리에 얹힌 왕관으로 읽히게 한다.
{
  const strip = new Float32Array(N * N);
  fillPoly(strip, tiltAround([[left - 30, crownBottom], [right + 30, crownBottom], [right + 30, crownBottom + CROWN_GAP], [left - 30, crownBottom + CROWN_GAP]]));
  for (let i = 0; i < out.length; i += 1) out[i] = Math.min(out[i], 1 - strip[i]);
}
// 끝에 동그란 보석
const ball = (cx, cy, r) => {
  const [tx, ty] = tiltAround([[cx, cy]])[0];
  const poly = [];
  for (let i = 0; i < 24; i += 1) poly.push([tx + r * Math.cos((i / 24) * Math.PI * 2), ty + r * Math.sin((i / 24) * Math.PI * 2)]);
  fillPoly(out, poly);
};
const r = headW * 0.07;
ball(left - 4, crownBottom - crownH * 0.88 - r * 0.6, r);
ball(headCx, crownBottom - crownH - r * 0.6, r * 1.15);
ball(right + 4, crownBottom - crownH * 0.88 - r * 0.6, r);

// 저장 + 그려진 부분(알파 128 이상)의 위치·크기
const png = new PNG({ width: N, height: N });
png.data.fill(0);
let minX = N;
let minY = N;
let maxX = 0;
let maxY = 0;
for (let i = 0; i < N * N; i += 1) {
  // 부풀린 가장자리에 남은 옅은 테두리는 지운다.
  const a = Math.round(Math.min(1, Math.max(0, (out[i] - 0.25) / 0.5)) * 255);
  png.data[i * 4 + 3] = a;
  if (a >= 128) {
    const x = i % N;
    const y = (i - x) / N;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
}
fs.writeFileSync('assets/icons/stage-0-alpha.png', PNG.sync.write(png));
console.log(`ink: { left: ${minX}, top: ${minY}, width: ${maxX - minX + 1}, height: ${maxY - minY + 1} }`);
