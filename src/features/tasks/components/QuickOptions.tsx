import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { formatDuration } from '@/lib/time';

import type { Importance } from '../types';

import { ImportanceSelect } from './ImportanceSelect';

// 할 일을 적는 동안에만 나타나는 두 줄: 중요도 [높음|보통|낮음], 걸리는 시간 5개. 고르지 않아도 기본값(보통·30분)으로 들어간다.
// 상자 없이 글자만: 고른 값은 진하고 나머지는 회색.
export const QUICK_MINUTES: readonly number[] = [15, 30, 45, 60, 120];

type QuickOptionsProps = {
  importance: Importance;
  minutes: number;
  onImportance: (importance: Importance) => void;
  onMinutes: (minutes: number) => void;
};

export const QuickOptions = ({ importance, minutes, onImportance, onMinutes }: QuickOptionsProps) => (
  <View style={styles.root}>
    <ImportanceSelect value={importance} onChange={onImportance} />
    <View style={styles.minutes}>
      {QUICK_MINUTES.map((value) => {
        const selected = value === minutes;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={formatDuration(value)}
            accessibilityState={{ selected }}
            onPress={() => onMinutes(value)}
            style={({ pressed }) => [styles.minute, pressed && styles.pressed]}
          >
            <AppText variant="body" color={selected ? 'ink' : 'textTertiary'} numberOfLines={1}>
              {formatDuration(value)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { gap: 4 },
  minutes: { flexDirection: 'row' },
  minute: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
});
