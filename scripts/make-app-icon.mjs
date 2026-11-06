// 앱 아이콘·적응형 아이콘·스플래시 그림을 만든다: node scripts/make-app-icon.mjs
// 원본: assets/icons/logo-ape-black.png (검은 유인원 실루엣). 결과는 assets/app/ 에 저장.
import { PNG } from 'pngjs';
import fs from 'node:fs';

const src = PNG.sync.read(fs.readFileSync('assets/icons/logo-ape-black.png'));

// 실루엣이 있는 영역(투명하지 않은 픽셀)의 바깥 상자
let x0 = src.width, y0 = src.height, x1 = 0, y1 = 0;
for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
  if (src.data[(y * src.width + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
}
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

// 실루엣을 size x size 캔버스 가운데에, 가장 긴 변이 fit 비율이 되게 그린다(면적 평균 축소).
function render(size, fit, bg) {
  const out = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    out.data[i * 4] = bg[0]; out.data[i * 4 + 1] = bg[1]; out.data[i * 4 + 2] = bg[2]; out.data[i * 4 + 3] = bg[3];
  }
  const scale = (size * fit) / Math.max(bw, bh);
  const dw = Math.round(bw * scale), dh = Math.round(bh * scale);
  const ox = Math.round((size - dw) / 2), oy = Math.round((size - dh) / 2);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sx0 = x0 + x / scale, sx1 = x0 + (x + 1) / scale, sy0 = y0 + y / scale, sy1 = y0 + (y + 1) / scale;
    let a = 0, n = 0;
    for (let sy = Math.floor(sy0); sy < Math.max(Math.ceil(sy1), Math.floor(sy0) + 1); sy++)
      for (let sx = Math.floor(sx0); sx < Math.max(Math.ceil(sx1), Math.floor(sx0) + 1); sx++) {
        a += src.data[(Math.min(sy, src.height - 1) * src.width + Math.min(sx, src.width - 1)) * 4 + 3]; n++;
      }
    const cov = a / n / 255; // 0..1, 검은색 위에 덮는 비율
    const o = ((oy + y) * size + (ox + x)) * 4;
    // 검정(17,17,17)을 배경 위에 합성
    const ba = bg[3] / 255, oa = cov + ba * (1 - cov);
    for (let c = 0; c < 3; c++) out.data[o + c] = oa === 0 ? 0 : Math.round((17 * cov + bg[c] * ba * (1 - cov)) / oa);
    out.data[o + 3] = Math.round(oa * 255);
  }
  return out;
}

const save = (name, png) => { fs.writeFileSync(`assets/app/${name}`, PNG.sync.write(png)); console.log(name, png.width + 'x' + png.height); };
const BG = [245, 245, 245, 255];
save('icon.png', render(1024, 0.7, BG));                 // 앱 아이콘(배경 포함)
save('adaptive-foreground.png', render(1024, 0.5, [0, 0, 0, 0])); // 적응형: 안전 영역(가운데 66%) 안쪽
save('monochrome.png', render(1024, 0.5, [0, 0, 0, 0])); // Android 13 테마 아이콘
save('splash.png', render(1024, 0.8, [0, 0, 0, 0]));     // 스플래시 그림(투명 배경, 크기는 app.json에서)
save('favicon.png', render(48, 0.8, BG));                // 웹 탭 아이콘
