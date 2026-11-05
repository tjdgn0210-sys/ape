import { Pressable, StyleSheet, View } from 'react-native';

import { useWindowDimensions } from 'react-native';

import { useColors } from '@/theme';

import { AppText } from './AppText';

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string; accessibilityLabel?: string }[];
  value: T;
  onChange: (value: T) => void;
  // small: 보조 선택(글자 작게). 기본은 큰 글자.
  size?: 'large' | 'small';
  // true면 고른 항목을 꽉 찬 검은 상자 + 흰 글씨로 표시한다.
  boxed?: boolean;
};

// 상자 없이 글자만 나란히: 고른 것은 진한 글자, 나머지는 회색(리디자인). 옵션이 많아도 같은 폭으로 나눈다.
export const SegmentedControl = <T extends string>({ options, value, onChange, size = 'large', boxed = false }: SegmentedControlProps<T>) => {
  const colors = useColors();
  // 좁은 폰에서는 큰 선택 글자를 한 단계 줄이고, 줄바꿈 없이 한 줄로 둔다.
  const { width } = useWindowDimensions();
  const largeVariant = width < 360 ? 'label' : 'heading';
  return (
  <View style={styles.row} accessibilityRole="radiogroup">
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={option.accessibilityLabel ?? option.label}
          accessibilityState={{ selected }}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [styles.option, size === 'small' && styles.optionSmall, boxed && styles.boxed, boxed && selected && { borderColor: colors.ink, backgroundColor: colors.ink }, pressed && styles.pressed]}
        >
          <AppText numberOfLines={1} variant={size === 'small' ? 'body' : largeVariant} color={boxed && selected ? 'onInk' : selected ? 'ink' : 'textTertiary'}>
            {option.label}
          </AppText>
        </Pressable>
      );
    })}
  </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  option: { flex: 1, minHeight: 48, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  optionSmall: { minHeight: 44 },
  boxed: { borderWidth: 2, borderColor: 'transparent', borderRadius: 16, marginHorizontal: 3 },
  pressed: { opacity: 0.5 },
});
