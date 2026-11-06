import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon, SegmentedControl } from '@/components/ui';
import { formatDuration } from '@/lib/time';
import { useColors } from '@/theme';

import { IMPORTANCE_LABEL, IMPORTANCE_ORDER, type Importance } from '../types';

// 할 일을 적는 동안 입력 칸 아래에 나오는 가장 단순한 두 줄(사용자 요청):
//   중요도     [높음 | 보통 | 낮음]
//   걸리는 시간  [−]  30분  [+]      ← 5분 단위, 누르고 있으면 계속 바뀐다
// 고르지 않아도 기본값(보통·30분)으로 들어간다.
export const MINUTE_STEP = 5;
export const MINUTE_MIN = 5;
export const MINUTE_MAX = 480;

const IMPORTANCE_OPTIONS = IMPORTANCE_ORDER.map((level) => ({
  value: level,
  label: IMPORTANCE_LABEL[level],
  accessibilityLabel: `중요도 ${IMPORTANCE_LABEL[level]}`,
}));

type QuickOptionsProps = {
  importance: Importance;
  minutes: number;
  onImportance: (importance: Importance) => void;
  onMinutes: (minutes: number) => void;
};

// −/+ 버튼: 한 번 누르면 5분, 길게 누르면 빠르게 계속(누른 채로 두면 30분→2시간도 금방).
const StepButton = ({ kind, disabled, onStep }: { kind: 'minus' | 'plus'; disabled: boolean; onStep: () => void }) => {
  const colors = useColors();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const repeat = () => {
    stepRef.current();
    timer.current = setTimeout(repeat, 90);
  };
  // 길게 누르면(0.4초) 연달아 바뀐다.
  const startRepeat = () => {
    stop();
    repeat();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={kind === 'minus' ? '5분 줄이기' : '5분 늘리기'}
      disabled={disabled}
      onPress={() => stepRef.current()}
      onLongPress={startRepeat}
      delayLongPress={400}
      onPressOut={stop}
      style={[styles.stepButton, { backgroundColor: colors.surface }, disabled && styles.disabled]}
    >
      <Icon name={kind === 'minus' ? 'minus' : 'plus'} size={16} color="ink" />
    </Pressable>
  );
};

export const QuickOptions = ({ importance, minutes, onImportance, onMinutes }: QuickOptionsProps) => {
  // 길게 눌러 연달아 바뀔 때도 최신 값에서 이어지게 ref로 들고 있다.
  const latest = useRef(minutes);
  latest.current = minutes;
  const stepBy = (delta: number) => onMinutes(Math.min(MINUTE_MAX, Math.max(MINUTE_MIN, latest.current + delta)));

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <AppText variant="caption" color="textSecondary" style={styles.label}>
          중요도
        </AppText>
        <View style={styles.control}>
          <SegmentedControl options={IMPORTANCE_OPTIONS} value={importance} onChange={onImportance} size="small" />
        </View>
      </View>
      <View style={styles.row}>
        <AppText variant="caption" color="textSecondary" style={styles.label}>
          걸리는 시간
        </AppText>
        <View style={[styles.control, styles.stepper]}>
          <StepButton kind="minus" disabled={minutes <= MINUTE_MIN} onStep={() => stepBy(-MINUTE_STEP)} />
          <AppText variant="title" color="ink" numberOfLines={1} style={styles.value} accessibilityLiveRegion="polite">
            {formatDuration(minutes)}
          </AppText>
          <StepButton kind="plus" disabled={minutes >= MINUTE_MAX} onStep={() => stepBy(MINUTE_STEP)} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  label: { width: 72 },
  control: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { flex: 1, textAlign: 'center' },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
});
