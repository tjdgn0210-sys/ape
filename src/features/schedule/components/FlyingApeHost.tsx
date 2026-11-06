import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useColors } from '@/theme';

import { planFlight } from '../flight';
import { useFlyStore, type Fly } from '../flyStore';
import { RunningApe } from './RunningApe';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// 화면 전체 위에 날아가는 유인원을 그린다(카드나 목록에 잘리지 않고 화면 밖까지 날아간다).
// 크기는 처음 그대로, 테두리 없는 주색 유인원이다.
const FlyingApe = ({ fly }: { fly: Fly }) => {
  const colors = useColors();
  const screen = useWindowDimensions();
  const land = useFlyStore((state) => state.land);
  const flight = useMemo(
    () => planFlight(fly.power, screen, { x: fly.x, y: fly.y }, Math.random, fly.kick === true),
    // 날기 시작할 때 한 번만 정한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fly.id],
  );
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(t, {
      toValue: 1,
      duration: flight.durationMs,
      easing: Easing.linear,
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start(() => land(fly.id));
    return () => animation.stop();
  }, [t, flight.durationMs, land, fly.id]);

  const translateX = t.interpolate({ inputRange: flight.times, outputRange: flight.xs });
  const translateY = t.interpolate({ inputRange: flight.times, outputRange: flight.ys });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${flight.spinDeg}deg`] });
  // 크기는 그대로(커지지 않는다, 사용자 요청). 테두리(스트로크)도 없다.
  const height = (fly.width * 700) / 740;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fly, { left: fly.x, top: fly.y, width: fly.width, height, transform: [{ translateX }, { translateY }, { rotate }] }]}
    >
      <RunningApe effort={0} moving={false} color={colors.ink} width={fly.width} />
    </Animated.View>
  );
};

export const FlyingApeHost = () => {
  const flies = useFlyStore((state) => state.flies);
  if (flies.length === 0) return null;
  return (
    <View pointerEvents="none" style={styles.host}>
      {flies.map((fly) => (
        <FlyingApe key={fly.id} fly={fly} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, elevation: 200 },
  fly: { position: 'absolute' },
});
