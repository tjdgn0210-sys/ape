import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, useColors, type ColorToken } from '@/theme';

type CardProps = {
  children: ReactNode;
  tone?: 'light' | 'subtle' | 'dark';
  style?: StyleProp<ViewStyle>;
};

const TONE_COLOR: Record<NonNullable<CardProps['tone']>, ColorToken> = {
  light: 'surface',
  subtle: 'surfaceAlt',
  dark: 'cardBg',
};

export const Card = ({ children, tone = 'light', style }: CardProps) => {
  const colors = useColors();
  return <View style={[styles.root, { backgroundColor: colors[TONE_COLOR[tone]] }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  root: { borderRadius: radii.card, padding: 20 },
});
