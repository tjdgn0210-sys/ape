import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useColors } from '@/theme';

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
};

const THUMB = 25; // 지름 22 + 흰 테두리(디자인 값)
const HEIGHT = 44;
const TRACK = 6;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const Slider = ({ value, min, max, step = 1, onChange, accessibilityLabel }: SliderProps) => {
  const colors = useColors();
  const [trackWidth, setTrackWidth] = useState(0);

  // PanResponder 콜백은 한 번만 만들어지므로 최신 값은 ref로 읽는다.
  const latest = useRef({ trackWidth, min, max, step, onChange });
  latest.current = { trackWidth, min, max, step, onChange };
  const startX = useRef(0);

  const valueAt = (x: number) => {
    const { trackWidth: width, min: lo, max: hi, step: stepSize } = latest.current;
    if (width <= 0) return lo;
    const ratio = clamp((x - THUMB / 2) / width, 0, 1);
    const stepped = Math.round((lo + ratio * (hi - lo)) / stepSize) * stepSize;
    return clamp(stepped, lo, hi);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        startX.current = event.nativeEvent.locationX;
        latest.current.onChange(valueAt(startX.current));
      },
      onPanResponderMove: (_event, gesture) => {
        latest.current.onChange(valueAt(startX.current + gesture.dx));
      },
    }),
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(Math.max(0, event.nativeEvent.layout.width - THUMB));
  };

  const ratio = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
  const thumbLeft = ratio * trackWidth;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
        onChange(clamp(value + delta, min, max));
      }}
      onLayout={onLayout}
      style={styles.root}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={styles.trackArea}>
        <View style={[styles.trackBase, { backgroundColor: colors.lineStrong }]} />
        <View style={[styles.trackFill, { width: thumbLeft, backgroundColor: colors.ink }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: thumbLeft, backgroundColor: colors.ink, borderColor: colors.background }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { height: HEIGHT, justifyContent: 'center' },
  trackArea: { marginHorizontal: THUMB / 2, height: TRACK, justifyContent: 'center' },
  trackBase: { height: 1 },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: TRACK,
    borderRadius: TRACK / 2,
  },
  thumb: {
    position: 'absolute',
    top: (HEIGHT - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
});
