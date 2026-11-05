import type { TextStyle } from 'react-native';

// 흑백 디자인에 맞춰 한글·숫자 모두 IBM Plex Sans KR Bold를 쓴다(@expo-google-fonts/ibm-plex-sans-kr, SIL OFL).
export const fontFamily = {
  display: 'IBMPlexSansKR_700Bold',
  numeric: 'IBMPlexSansKR_700Bold',
} as const;

type Variant = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

// 크기는 디자인의 글자 윤곽 크기에서 역산한 값(Estimate).
export const typography = {
  display: { fontFamily: fontFamily.display, fontSize: 33, lineHeight: 40 },
  headline: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fontFamily.display, fontSize: 25, lineHeight: 30 },
  heading: { fontFamily: fontFamily.display, fontSize: 24, lineHeight: 30 },
  label: { fontFamily: fontFamily.display, fontSize: 20, lineHeight: 26 },
  button: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fontFamily.display, fontSize: 17, lineHeight: 22 },
  subtitle: { fontFamily: fontFamily.display, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamily.display, fontSize: 12.5, lineHeight: 16 },
  cardTitle: { fontFamily: fontFamily.display, fontSize: 29, lineHeight: 34 },
  section: { fontFamily: fontFamily.display, fontSize: 18, lineHeight: 24 },
  itemTitle: { fontFamily: fontFamily.display, fontSize: 19, lineHeight: 24 },
  numberTiny: { fontFamily: fontFamily.numeric, fontSize: 15, lineHeight: 18 },
  meta: { fontFamily: fontFamily.display, fontSize: 13.5, lineHeight: 18 },
  calendarDay: { fontFamily: fontFamily.numeric, fontSize: 14.5, lineHeight: 18 },
  numberMedium: { fontFamily: fontFamily.numeric, fontSize: 36, lineHeight: 42 },
  numberLarge: { fontFamily: fontFamily.numeric, fontSize: 54, lineHeight: 60 },
  numberSmall: { fontFamily: fontFamily.numeric, fontSize: 16, lineHeight: 20 },
} as const satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;

export const scaledTypography = (variant: TypographyVariant, scale: number) => {
  const base = typography[variant];
  return { fontFamily: base.fontFamily, fontSize: base.fontSize * scale, lineHeight: base.lineHeight * scale };
};
