import { StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { formatDuration } from '@/lib/time';

type TimeFitNoticeProps = {
  // 오늘 쓸 수 있는 시간(분)
  available: number;
  // 할 일 합 + 사이 가장 짧은 쉬는 시간(분)
  needed: number;
  // 계획에 들어가는 할 일 수(0이면 시작할 수 없다)
  fitCount: number;
  // 빠지게 되는 할 일 제목
  excludedTitles: readonly string[];
};

// 쓸 수 있는 시간보다 할 일이 길 때 미리 알려 준다. 상자 없이 [경고] + 두 줄 글자. 하나도 안 들어가면 빨간 글자.
export const TimeFitNotice = ({ available, needed, fitCount, excludedTitles }: TimeFitNoticeProps) => {
  if (needed <= available || available <= 0) return null;
  const blocked = fitCount === 0;
  const tone = blocked ? 'danger' : 'ink';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={
        blocked
          ? `이대로는 시작할 수 없어요. 쓸 수 있는 시간 ${formatDuration(available)}, 필요한 시간 ${formatDuration(needed)}`
          : `시간이 모자라요. 중요도가 낮은 일부터 빠져요: ${excludedTitles.join(', ')}`
      }
      style={styles.box}
    >
      <Icon name="warning" size={20} color={tone} />
      <View style={styles.text}>
        <AppText variant="body" color={tone}>
          {blocked ? '이대로는 시작할 수 없어요' : `${excludedTitles.length}개는 빠져요`}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {`필요 ${formatDuration(needed)} · 가능 ${formatDuration(available)}`}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1 },
});
