export type ThemeName = 'light' | 'dark';

// 같은 이름이 두 모드에서 같은 "역할"을 한다. 모드마다 값만 다르다.
// ink = 주색(글자, 선택된 칩 배경), onInk = ink 위에 올리는 글자/아이콘,
// cardBg = 어두운 카드 배경, onCard = 그 카드 위 글자.
const light = {
  ink: '#161616',
  inkSoft: '#1F1F1F',
  background: '#F5F5F5',
  onInk: '#F5F5F5',

  textSecondary: '#777777',
  textTertiary: '#888888',
  textMuted: '#AAAAAA',
  textHint: '#999999',
  dayText: '#666666',
  dateText: '#8A8A8A',

  surface: '#E9E9E9',
  surfaceAlt: '#EFEFEF',
  line: '#DEDEDE',
  lineStrong: '#BBBBBB',
  checkBorder: '#DDDDDD',

  lockCard: '#242424',
  overlay: 'rgba(0, 0, 0, 0.25)',

  success: '#34C172',
  // 삭제·초기화처럼 되돌릴 수 없는 동작(빨강, Estimate)
  // 완료한 일정의 카드(초록, Estimate. 사용자 요청으로 살짝 밝게: #1E9E55 → #34C172)와 그 위 글자·바
  doneCard: '#34C172',
  onDone: '#FFFFFF',
  doneSoft: '#EBF9F1',
  doneText: '#22A15A',
  onDoneMuted: '#E6F8EE',
  doneTrack: '#82D9A8',
  doneFill: '#FFFFFF',
  danger: '#E5373D',
  onDanger: '#FFFFFF',

  cardBg: '#161616',
  onCard: '#F5F5F5',
  onCardMuted: '#AAAAAA',
  cardTrack: '#444444',
  cardFill: '#AAAAAA',

  // 계획표 세로 막대(가까운 일정 -> 먼 일정)
  // 다음 일정 세로 막대: 가장 가까운 일정이 bar3(진한 검정), 멀수록 bar2 → bar1(연한 색)
  bar1: '#D9D9D9',
  bar2: '#8A8A8A',
  bar3: '#1F1F1F',
} as const;

export type ColorToken = keyof typeof light;
export type Palette = Record<ColorToken, string>;

const dark: Palette = {
  ink: '#F2F2F2',
  inkSoft: '#E0E0E0',
  background: '#0B0B0B',
  onInk: '#161616',

  textSecondary: '#A0A0A0',
  textTertiary: '#8E8E8E',
  textMuted: '#6B6B6B',
  textHint: '#7A7A7A',
  dayText: '#A0A0A0',
  dateText: '#8A8A8A',

  surface: '#1C1C1C',
  surfaceAlt: '#171717',
  line: '#2C2C2C',
  lineStrong: '#555555',
  checkBorder: '#444444',

  lockCard: '#242424',
  overlay: 'rgba(0, 0, 0, 0.6)',

  success: '#3CC77A',
  doneCard: '#2BA862',
  onDone: '#FFFFFF',
  doneSoft: '#13291D',
  doneText: '#74DDA1',
  onDoneMuted: '#DDF5E7',
  doneTrack: '#6CC895',
  doneFill: '#FFFFFF',
  danger: '#FF5A5F',
  onDanger: '#FFFFFF',

  cardBg: '#262626',
  onCard: '#FFFFFF',
  onCardMuted: '#A0A0A0',
  cardTrack: '#4A4A4A',
  cardFill: '#BBBBBB',

  bar1: '#3A3A3A',
  bar2: '#707070',
  bar3: '#E6E6E6',
};

export const palettes: Record<ThemeName, Palette> = { light, dark };
