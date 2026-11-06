import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { useColors } from '@/theme';

type StepHeaderProps = {
  step: 1 | 2 | 3;
  title: string;
  // 있으면 왼쪽에 뒤로 가기 화살표(2·3단계). 없으면 진행 막대만.
  // (예전 뒤로 가기 화살표용. 이제 아래 [이전] 버튼이 대신하므로 쓰지 않는다)
  onBack?: () => void;
  // true면 제목을 작고 회색으로(1단계: 제목보다 시각이 먼저 보이게)
  quiet?: boolean;
  // 제목 오른쪽 끝의 작은 회색 글자(예: 총 4시간)
  note?: string;
};

const STEPS = [1, 2, 3] as const;
// 바의 채움 위치(0~3)는 화면이 바뀌어도 이어지도록 모듈에 둔다. 다음 화면이 보이면 거기서 자기 단계까지 차오른다.
let barPosition = 0;

// 계획 만들기 3단계 머리글: [‹] + 진행 막대(지금 단계까지 검게) + 제목. 글자는 제목 하나뿐이다.
export const StepHeader = ({ step, title, quiet = false, note }: StepHeaderProps) => {
  const colors = useColors();
  const router = useRouter();
  const progress = useRef(new Animated.Value(barPosition)).current;
  useFocusEffect(
    useCallback(() => {
      progress.setValue(barPosition);
      Animated.timing(progress, { toValue: step, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      barPosition = step;
    }, [progress, step]),
  );
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={styles.bar} accessibilityLabel={`${step}단계, 모두 3단계`}>
          {STEPS.map((index) => (
            <View key={index} style={[styles.segment, { backgroundColor: colors.line }]}>
              <Animated.View
                style={[
                  styles.fill,
                  { backgroundColor: colors.ink, width: progress.interpolate({ inputRange: [index - 1, index], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) },
                ]}
              />
            </View>
          ))}
        </View>
        {/* 맨 위 오른쪽에는 항상 설정 버튼이 있다. */}
        <Pressable accessibilityRole="button" accessibilityLabel="설정" hitSlop={12} onPress={() => router.push('/settings')} style={styles.gear}>
          <Icon name="gear" size={20} color="ink" />
        </Pressable>
      </View>
      <View style={styles.titleRow}>
        {/* 긴 제목이 두 줄로 넘어갈 때 단어 중간에서 끊기지 않게 한다(웹 전용, 앱은 원래 띄어쓰기에서 줄바꿈). */}
        <AppText variant={quiet ? 'body' : 'display'} color={quiet ? 'textTertiary' : 'ink'} style={styles.title}>
          {title}
        </AppText>
        {note !== undefined ? (
          <AppText variant="body" color="textSecondary">
            {note}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { marginTop: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 36 },
  back: { width: 24, height: 36 },
  backHit: { width: 24, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  bar: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  gear: { width: 28, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  title: { flexShrink: 1, ...(Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as object) : null) },
  titleRow: { marginTop: 18, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
