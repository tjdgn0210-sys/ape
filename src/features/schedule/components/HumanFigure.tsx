import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

import { HUMAN_FRAMES } from '../humanFrames';

// 미리 구워 둔 사람 프레임 그림 묶음(scripts/make-human-frames.mjs가 만든 assets/human/human-frames.png).
// 현대인 아이콘 그대로를 구부려 걷기·슈퍼맨 비행·착지(눕힘↔섬)·발차기·쉬는 자세를 담았다. 유인원(RunningApe)과 같은 방식으로 한 칸씩 재생한다.
const sheet = require('../../../../assets/human/human-frames.png');

const { cols, cellW, cellH, gap, baseW, baseH, mx, mt, sheetW, sheetH, restIndex, walk, fly, tilt, kick } = HUMAN_FRAMES;
const ASPECT = baseH / baseW;

export const HUMAN_ASPECT_W = baseW / baseH; // 폭 / 높이

const FRAME_MS = 33; // 약 30프레임으로 그림을 바꾼다
export const KICK_MS = 560; // 발차기 한 번
export const TILT_MS = 220; // 눕힌 자세 ↔ 선 자세
const WALK_CYCLES_PER_SEC = 1.6; // 걸음 한 주기(두 발짝) 속도(바 위에서 천천히 걷기)
const FLY_CYCLES_PER_SEC = 2.2; // 날면서 다리가 파닥이는 속도

type HumanFigureProps = {
  // walk: 걷기(반복) / fly: 슈퍼맨처럼 날기(반복) / tilt: 날던 자세에서 서기(한 번) / tiltBack: 서 있다가 눕기(한 번)
  // kick: 발차기(한 번) / rest: 서 있기
  mode: 'walk' | 'fly' | 'tilt' | 'tiltBack' | 'kick' | 'rest';
  // 사람 그림 높이(pt). 폭은 비율대로.
  height: number;
  color: string;
  // true면 왼쪽을 보고 선다
  flip?: boolean;
  // 발이 닿는 순간 한 번(kick)
  onContact?: () => void;
  // 한 번만 재생하는 동작(tilt, tiltBack, kick)이 끝났을 때 한 번
  onDone?: () => void;
};

// 사람(현대인) 그림. 진행 바 위를 걷거나, 슈퍼맨처럼 날아가 유인원을 걷어찬다.
export const HumanFigure = ({ mode, height, color, flip = false, onContact, onDone }: HumanFigureProps) => {
  const [index, setIndex] = useState<number>(mode === 'rest' ? restIndex : walk.start);
  const contactRef = useRef(onContact);
  contactRef.current = onContact;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (mode === 'rest') {
      setIndex(restIndex);
      return;
    }
    let raf = 0;
    let startedAt = 0;
    let lastDraw = 0;
    let contacted = false;
    let ended = false;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (startedAt === 0) startedAt = now;
      const elapsed = now - startedAt;
      if (now - lastDraw < FRAME_MS && elapsed > 0) return;
      lastDraw = now;
      if (mode === 'walk' || mode === 'fly') {
        const set = mode === 'fly' ? fly : walk;
        const cycles = (elapsed / 1000) * (mode === 'fly' ? FLY_CYCLES_PER_SEC : WALK_CYCLES_PER_SEC);
        const next = set.start + (Math.floor((cycles % 1) * set.count) % set.count);
        setIndex((prev) => (prev === next ? prev : next));
        return;
      }
      // 한 번만 재생하는 동작
      const ms = mode === 'kick' ? KICK_MS : TILT_MS;
      const t = Math.min(1, elapsed / ms);
      let next: number;
      if (mode === 'kick') next = kick.start + Math.min(kick.count - 1, Math.floor(t * kick.count));
      else if (mode === 'tilt') next = tilt.start + Math.min(tilt.count - 1, Math.floor(t * tilt.count));
      else next = tilt.start + tilt.count - 1 - Math.min(tilt.count - 1, Math.floor(t * tilt.count));
      setIndex((prev) => (prev === next ? prev : next));
      if (mode === 'kick' && !contacted && next >= kick.contact) {
        contacted = true;
        contactRef.current?.();
      }
      if (!ended && t >= 1) {
        ended = true;
        doneRef.current?.();
        cancelAnimationFrame(raf);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const width = height / ASPECT;
  const scale = width / baseW;
  const col = index % cols;
  const row = Math.floor(index / cols);

  return (
    <View style={{ width, height, transform: [{ scaleX: flip ? -1 : 1 }] }}>
      {/* 몸 그림 상자에 맞춘 위치에 여백까지 포함한 한 칸 크기 창을 두고, 창 안에서 묶음 그림을 옮겨 한 칸만 보이게 한다. */}
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
