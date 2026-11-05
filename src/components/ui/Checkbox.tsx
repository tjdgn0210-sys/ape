import { Pressable, StyleSheet } from 'react-native';

import { radii, useColors, type ColorToken } from '@/theme';

import { Icon } from './Icon';

type CheckboxProps = {
  checked: boolean;
  onPress?: () => void;
  size?: number;
  // 기본은 연한 회색(기록 화면). 계획표의 체크박스는 더 진한 회색을 쓴다.
  borderColor?: ColorToken;
  accessibilityLabel?: string;
};

export const Checkbox = ({ checked, onPress, size = 22, borderColor = 'checkBorder', accessibilityLabel }: CheckboxProps) => {
  const colors = useColors();

  return (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel={accessibilityLabel}
    hitSlop={11}
    onPress={onPress}
    style={[
      styles.root,
      { width: size, height: size },
      { backgroundColor: checked ? colors.ink : colors.background, borderColor: colors[borderColor] },
    ]}
  >
    {checked ? <Icon name="check" size={size * 0.45} color="onInk" /> : null}
  </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.checkbox,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
