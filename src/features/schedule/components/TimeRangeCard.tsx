import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/ui';
import { formatClock12 } from '@/lib/time';
import { useColors } from '@/theme';

type TimeBlockProps = {
  label: string;
  minuteOfDay: number;
  invalid?: boolean;
  // true면 검은 바탕 + 흰 글씨(종료), false면 흰 바탕 + 검은 글씨(시작)
  dark?: boolean;
  onPress: () => void;
};

// 위에서 아래까지 꽉 찬 한쪽 면: 작은 라벨 + "오전/오후" + 아주 큰 시각. 누르면 시간을 고친다.
const TimeBlock = ({ label, minuteOfDay, invalid = false, dark = false, onPress }: TimeBlockProps) => {
  const colors = useColors();
  // 좁은 폰(320~360pt)에서는 숫자를 한 단계 줄여 "오후 4:00"이 반쪽 안에 여유 있게 들어가게 한다.
  const { width } = useWindowDimensions();
  const timeSize = width < 360 ? { fontSize: 34, lineHeight: 42 } : null;
  const { period, text } = formatClock12(minuteOfDay);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 시간 ${period} ${text}`}
      accessibilityHint="누르면 시간을 바꿀 수 있어요"
      onPress={onPress}
      style={({ pressed }) => [styles.block, { backgroundColor: dark ? colors.ink : colors.background }, pressed && styles.pressed]}
    >
      <AppText variant="subtitle" color={invalid ? 'danger' : dark ? 'textMuted' : 'textTertiary'}>
        {label}
      </AppText>
      <View style={styles.timeRow}>
        <AppText variant="label" color={invalid ? 'danger' : dark ? 'onInk' : 'textSecondary'}>
          {period}
        </AppText>
        <AppText variant="numberLarge" color={invalid ? 'danger' : dark ? 'onInk' : 'ink'} numberOfLines={1} style={[styles.time, timeSize]}>
          {text}
        </AppText>
      </View>
    </Pressable>
  );
};

type TimeRangeCardProps = {
  startMin: number;
  endMin: number;
  // 쓸 수 있는 시간(분). 0 이하면 잘못된 범위.
  available: number;
  onPressStart: () => void;
  onPressEnd: () => void;
  // 지금 고르는(마지막으로 누른) 쪽. 이쪽이 검은 큰 면 + 흰 글씨가 되고 다른 쪽은 흰 면이다. 크기는 그대로.
  active?: 'start' | 'end';
};

// 화살표 없이 좌우로 나뉜 한 장: 왼쪽 시작 = 흰색, 오른쪽 종료 = 검정 + 흰 글씨. 아래에 총 시간 한 줄.
export const TimeRangeCard = ({ startMin, endMin, available, onPressStart, onPressEnd, active = 'start' }: TimeRangeCardProps) => {
  const valid = available > 0;

  return (
    <View style={styles.root}>
      <View style={styles.split}>
        <TimeBlock label="시작" minuteOfDay={startMin} dark={active === 'start'} onPress={onPressStart} />
        <TimeBlock label="종료" minuteOfDay={endMin} invalid={!valid} dark={active === 'end'} onPress={onPressEnd} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  // 테두리 없이 화면 가로 전체를 반으로: 왼쪽 흰색, 오른쪽 검정.
  split: { flex: 1, flexDirection: 'row' },
  block: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  timeRow: { marginTop: 6, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  time: { fontSize: 40, lineHeight: 48 },
});
