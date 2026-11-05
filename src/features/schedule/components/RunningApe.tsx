import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

import { gaitParams } from '../apePose';
import { APE_FRAMES } from '../apeFrames';

// 미리 구워 둔 프레임 그림 묶음(scripts/make-ape-frames.mjs가 만든 assets/ape/ape-frames.png).
// 팔다리를 따로 돌리면 관절 이음매가 깨져 보여서(사용자 지적), 프레임마다 완성된 실루엣 한 장을 그대로 재생한다.
const sheet = require('../../../../assets/ape/ape-frames.png');

type RunningApeProps = {
  // 0 천천히 걷기 ... 1 전력 질주
  effort: number;
  // false면 서 있는다(시작 전, 완료한 구간)
  moving: boolean;
  color: string;
  width: number;
};

const FRAME_MS = 33; // 약 30프레임으로 그림을 바꾼다
const EFFORT_RATE = 0.6; // 걸음이 바뀔 때 1초에 이만큼씩만 따라간다(뚝 바뀌지 않게)

const { cols, cellW, cellH, gap, baseW, baseH, mx, mt, sheetW, sheetH, sets, restIndex } = APE_FRAMES;
const ASPECT = baseH / baseW;

// 걸음 세기에 가까운 세트(걷기 / 뛰기 / 전력 질주)를 고른다. 세트 사이 경계는 두 세트가 만들어진 세기의 가운데.
const setIndexFor = (u: number) => {
  let best = 0;
  sets.forEach((set, index) => {
    if (Math.abs(set.u - u) < Math.abs(sets[best]!.u - u)) best = index;
  });
  return best;
};

// 걷는 유인원. 세기가 오르면 걸음이 빨라지고 어느 지점부터 통통 튀며 뛴다(그림에 구워져 있다).
export const RunningApe = ({ effort, moving, color, width }: RunningApeProps) => {
  // 보여 줄 그림 번호(묶음 안 순서). 서 있을 때는 원래 아이콘 그대로의 쉬는 자세 칸이다.
  const [index, setIndex] = useState<number>(restIndex);
  const target = useRef(effort);
  target.current = effort;

  useEffect(() => {
    if (!moving) {
      setIndex(restIndex);
      return;
    }
    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    let cycles = 0; // 걸음 바퀴 수(계속 증가)
    let u = target.current;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (last === 0) last = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const diff = target.current - u;
      u += Math.sign(diff) * Math.min(Math.abs(diff), EFFORT_RATE * dt);
      cycles += gaitParams(u).cyclesPerSec * dt;
      if (now - lastDraw >= FRAME_MS) {
        lastDraw = now;
        const set = sets[setIndexFor(u)]!;
        const frameInSet = Math.floor((cycles % 1) * set.count) % set.count;
        const next = set.start + frameInSet;
        setIndex((prev) => (prev === next ? prev : next));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moving]);

  const scale = width / baseW;
  const col = index % cols;
  const row = Math.floor(index / cols);

  return (
    <View style={{ width, height: width * ASPECT }}>
      {/* 몸 그림 상자(폭 width)에 맞춘 위치에 여백까지 포함한 한 칸 크기 창을 두고, 창 안에서 묶음 그림을 옮겨 한 칸만 보이게 한다. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -mx * scale,
          top: -mt * scale,
          width: cellW * scale,
          height: cellH * scale,
          overflow: 'hidden',
        }}
      >
        <Image
          source={sheet}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            left: -col * (cellW + gap) * scale,
            top: -row * (cellH + gap) * scale,
            width: sheetW * scale,
            height: sheetH * scale,
            tintColor: color,
          }}
        />
      </View>
    </View>
  );
};
