import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { formatClock } from '@/lib/time';
import { useColors } from '@/theme';

import type { PlanItem } from '../types';

type TimelineRowProps = {
  item: PlanItem;
  // 바로 다음 일정이면 크고 진하게 + [다음] 표시, 그 뒤는 작은 회색으로 물러난다(사용자 요청: 다음 일정이 한눈에 보이게).
  primary?: boolean;
  // 시작을 못 한 일정은 흐리게
  muted?: boolean;
  // 길이 옆에 붙이는 짧은 설명(예: "늦게 시작 17:20")
  note?: string;
};

// 세로 막대 없이: [시각] [제목] [길이]. 바로 다음 일정만 큼직한 검은 글자에 검은 "다음" 표시가 붙는다.
export const TimelineRow = ({ item, primary = false, muted = false, note }: TimelineRowProps) => {
  const colors = useColors();
  const isTask = item.kind === 'task';
  const title = isTask ? item.title : '휴식';
  const duration = `${item.endMin - item.startMin}분${note === undefined ? '' : ` · ${note}`}`;

  if (primary && !muted) {
    return (
      <View style={styles.primaryRow} accessibilityLabel={`다음 일정 ${formatClock(item.startMin)} ${title} ${duration}`}>
        <View style={[styles.tag, { backgroundColor: colors.ink }]}>
          <AppText variant="caption" color="onInk">
            다음
          </AppText>
        </View>
        <View style={styles.primaryBody}>
          <AppText variant="title" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {`${formatClock(item.startMin)} 시작 · ${duration}`}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <AppText variant="numberSmall" color="textTertiary" style={styles.time}>
        {formatClock(item.startMin)}
      </AppText>
      <AppText variant="itemTitle" color={muted ? 'textMuted' : 'textSecondary'} numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <AppText variant="subtitle" color="textMuted">
        {duration}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 14 },
  time: { width: 52 },
  title: { flex: 1 },
  primaryRow: { marginBottom: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tag: { height: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBody: { flex: 1, gap: 2 },
});
