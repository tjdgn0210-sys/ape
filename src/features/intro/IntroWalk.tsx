import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { RunningApe } from '@/features/schedule/components/RunningApe';
import { useColors } from '@/theme';

// 앱을 처음 켤 때(실행할 때마다 한 번) 보이는 첫 화면(사용자 요청: 그냥 유인원이 걷는 모습).
// 계획표에서 쓰는 걷는 유인원(RunningApe)이 제자리에서 걷다가 서서히 사라진다.
// 예전의 "사람 → 유인원으로 변하는" 그림 묶음(assets/intro/walk-sprite.png)은 더 이상 쓰지 않는다.
// 아이콘 크기(폭). 영상 칸 전체가 유인원이라 이 폭이 곧 유인원 폭이다. 예전(200)보다 조금 작게.
const APE_WIDTH = 38;
// 걸음 세기(0~1): 재생 속도만 정한다. 0.3 = 초당 약 0.94바퀴 = 영상 원래 속도.
const WALK_EFFORT = 0.3;
// 인트로 전체 2.4초 = 걷기 2초 + 사라지는 0.4초
const WALK_MS = 2000;
const FADE_MS = 400;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// 앱 실행(프로세스) 동안 한 번만 보인다. 화면 모드를 바꾸는 등 다시 그려져도 또 나오지 않는다.
let shownOnce = false;

export const IntroWalk = () => {
  const colors = useColors();
  const [visible, setVisible] = useState(!shownOnce);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    shownOnce = true;
    const animation = Animated.sequence([
      Animated.delay(WALK_MS),
      Animated.timing(fade, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
    ]);
    animation.start(() => setVisible(false));
    return () => animation.stop();
  }, [visible, fade]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.background, opacity: fade }]}
      accessibilityLabel="못지키면 유인원"
    >
      <AppText variant="display">못지키면 유인원</AppText>
      <View style={styles.stage}>
        <View style={styles.ape}>
          <RunningApe effort={WALK_EFFORT} moving color={colors.ink} width={APE_WIDTH} />
        </View>
        <View style={styles.ground}>
          <View style={[styles.groundLine, { backgroundColor: colors.line }]} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },
  stage: { marginTop: 28, width: '100%', height: APE_WIDTH * 0.94 + 6, alignItems: 'center' },
  ape: { position: 'absolute', bottom: 2 },
  // 바닥선: 발바닥 높이에 둔다.
  ground: { position: 'absolute', left: 24, right: 24, bottom: 0, height: 2 },
  groundLine: { flex: 1 },
});
