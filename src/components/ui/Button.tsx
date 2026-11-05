import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, radii, useColors } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './iconPaths';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  // danger: 빨간 버튼(초기화처럼 되돌릴 수 없는 동작)
  variant?: 'primary' | 'secondary' | 'danger' | 'gray';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  // 글자 앞에 붙는 아이콘(사용자 요청: 아이콘 중심)
  icon?: IconName;
};

export const Button = ({ label, onPress, variant = 'primary', disabled = false, style, icon }: ButtonProps) => {
  const colors = useColors();
  // 채운 면은 주 행동(primary)과 위험(danger) 버튼뿐. 보조 버튼은 글자만(리디자인: 상자 없애기).
  const background = variant === 'primary' ? colors.ink : variant === 'danger' ? colors.danger : variant === 'gray' ? colors.surface : 'transparent';
  const textColor = variant === 'primary' ? 'onInk' : variant === 'danger' ? 'onDanger' : variant === 'gray' ? 'textSecondary' : 'ink';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { backgroundColor: background },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon !== undefined ? (
        <View style={styles.content}>
          <Icon name={icon} size={20} color={textColor} />
          <AppText variant="button" color={textColor}>
            {label}
          </AppText>
        </View>
      ) : (
        <AppText variant="button" color={textColor}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    height: layout.controlHeight,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { transform: [{ scale: 0.98 }] },
  // 비활성 상태는 디자인에 없다(Estimate).
  disabled: { opacity: 0.3 },
});
