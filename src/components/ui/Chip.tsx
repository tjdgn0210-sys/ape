import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { layout } from '@/theme';

import { AppText } from './AppText';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  // fill: 부모 가로폭을 균등 분할. auto: 글자 크기에 맞춤.
  width?: 'fill' | 'auto';
  // compact: 글자를 한 단계 작게
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  // 예전 칩 배경용 옵션(이제 배경이 없어서 쓰지 않는다. 호출부 호환용)
  onCard?: boolean;
  minWidth?: number;
};

// 상자 없이 글자만: 고른 것은 진한 글자, 안 고른 것은 회색 글자(리디자인: 상자·테두리 없애기).
export const Chip = ({ label, selected = false, onPress, onLongPress, width = 'auto', compact = false, style }: ChipProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    onLongPress={onLongPress}
    style={({ pressed }) => [styles.root, width === 'fill' ? styles.fill : styles.auto, pressed && styles.pressed, style]}
  >
    <AppText variant={compact ? 'subtitle' : 'body'} color={selected ? 'ink' : 'textTertiary'} numberOfLines={1}>
      {label}
    </AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  root: { height: layout.chipHeight, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  auto: { paddingHorizontal: 10 },
  pressed: { opacity: 0.5 },
});
