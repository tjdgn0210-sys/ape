import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { formatClock } from '@/lib/time';

import type { PlanTaskItem } from '../types';

type CompletedRowProps = {
  item: PlanTaskItem;
  // [시작]을 누른 시각(하루 중 초). 없으면 null.
  startedAtSec: number | null;
  // 방금 시작한 일정이면 카드에서 떨어져 나온 듯 위에서 내려오며 나타난다.
  animateIn?: boolean;
};

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// "시작한 일정" 한 줄: 초록 체크 + 할 일 + "14:03 시작". 상자 없이 글자만, 체크만 초록(성공 표시).
export const CompletedRow = ({ item, startedAtSec, animateIn = false }: CompletedRowProps) => {
  const enter = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  useEffect(() => {
    if (!animateIn) return;
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 70, useNativeDriver: USE_NATIVE_DRIVER }).start();
    // 처음 그릴 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 5분 안에만 눌렀으면 똑같은 성공이라 "n분 늦게"는 보여 주지 않는다(사용자 요청).
  const meta = `${formatClock(startedAtSec === null ? item.startMin : Math.floor(startedAtSec / 60))} 시작`;

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] }) }],
        },
      ]}
    >
      <Icon name="checkmark" size={18} color="doneText" />
      <AppText variant="itemTitle" color="textSecondary" numberOfLines={1} style={styles.title}>
        {item.title}
      </AppText>
      <AppText variant="subtitle" color="textMuted">
        {meta}
      </AppText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { flex: 1 },
});
