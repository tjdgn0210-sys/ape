// 단위는 pt. 디자인 기준 프레임은 393x852.
export const layout = {
  screenMargin: 24,
  headerHeight: 44,
  controlHeight: 56,
  inputHeight: 62,
  chipHeight: 40,
  hitTarget: 44,
} as const;

export const radii = {
  input: 12,
  button: 16,
  chip: 10,
  card: 20,
  sheet: 20,
  checkbox: 7,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
