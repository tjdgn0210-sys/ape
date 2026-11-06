// scripts/make-human-frames.mjs가 만든 값이다. 직접 고치지 말고 스크립트를 다시 돌린다.
// 프레임 묶음 assets/human/human-frames.png: 현대인 아이콘(stage-1-human.png)을 구부려 만든 걷기·발차기 그림.
export const HUMAN_FRAMES = {
  cols: 8,
  cellW: 266,
  cellH: 242,
  gap: 2,
  // 아이콘 몸 그림 상자(폭 131 x 높이 222). 칸은 이 상자보다 왼쪽 mx, 위쪽 mt만큼 바깥에서 시작한다.
  baseW: 131,
  baseH: 222,
  mx: 68,
  mt: 13,
  sheetW: 2142,
  sheetH: 1706,
  // 쉬는 자세(원본 아이콘 그대로)의 칸 번호
  restIndex: 52,
  walk: { start: 0, count: 24 },
  // fly = 슈퍼맨처럼 날아가는 자세(몸을 눕히고 한 팔을 앞으로, 다리는 뒤로) 반복
  fly: { start: 24, count: 8 },
  // tilt = 눕힌 자세 → 서는 자세로 바뀌는 칸(착지). 거꾸로 재생하면 날아오르기
  tilt: { start: 32, count: 6 },
  // contact = 발이 닿는 칸 번호(묶음 안 순서)
  kick: { start: 38, count: 14, contact: 45 },
} as const;
