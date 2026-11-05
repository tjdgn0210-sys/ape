import type { ReactNode } from 'react';
import { View } from 'react-native';

type ChipGroupProps = {
  children: ReactNode;
  // 디자인: 시트의 칩은 9pt, 시간 설정 화면의 칩은 8pt 간격이다.
  gap?: number;
};

export const ChipGroup = ({ children, gap = 9 }: ChipGroupProps) => (
  <View style={{ flexDirection: 'row', gap }}>{children}</View>
);
