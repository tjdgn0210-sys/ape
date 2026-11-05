// scripts/make-ape-frames.mjs가 만든 값이다. 직접 고치지 말고 스크립트를 다시 돌린다.
// 프레임 묶음 assets/ape/ape-frames.png: 칸 크기·여백·세트 정보. 그림은 원래 유인원 아이콘(logo-ape-black.png)을 구부려 만든다.
export const APE_FRAMES = {
  cols: 7,
  // 한 칸 크기(픽셀)와 칸 사이 빈 줄
  cellW: 334,
  cellH: 293,
  gap: 2,
  // 아이콘 몸 그림 상자(폭 262 x 높이 247). 칸은 이 상자보다 왼쪽 mx, 위쪽 mt만큼 바깥에서 시작한다.
  baseW: 262,
  baseH: 247,
  mx: 43,
  mt: 26,
  sheetW: 2350,
  sheetH: 1768,
  // 쉬는 자세(원본 아이콘 그대로)의 칸 번호
  restIndex: 40,
  // 세트 순서 = 묶음 안 순서. u = 그 세트를 만들 때의 걸음 세기, start = 첫 칸 번호, count = 칸 수
  sets: [{"name":"walk","u":0.1,"start":0,"count":16},{"name":"trot","u":0.6,"start":16,"count":12},{"name":"gallop","u":1,"start":28,"count":12}],
} as const;
