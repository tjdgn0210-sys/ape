import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { AppText } from '@/components/ui';

export const WHEEL_ROW = 48;
export const WHEEL_VISIBLE_ROWS = 5;
// 끝없이 도는 휠: 목록을 이만큼 이어 붙인 높이만 만들고, 화면 근처 줄만 그린다(수천 줄을 한꺼번에 그리면 느려지고 꺼진다).
const REPEAT = 11;
// 가운데 줄 위아래로 이만큼만 그린다.
const RENDER_RADIUS = 6;

export type WheelItem = { key: number; label: string };

type WheelColumnProps = {
  items: readonly WheelItem[];
  value: number;
  onChange: (key: number) => void;
  loop?: boolean;
  width?: number;
  accessibilityLabel: string;
  // 글자 크기를 한 단계 줄인다("2026년"처럼 글자가 긴 휠)
  compact?: boolean;
};

type RowProps = { label: string; distance: number; top: number; compact: boolean };

const Row = memo(({ label, distance, top, compact }: RowProps) => (
  <View style={[styles.row, { top }]}>
    <AppText numberOfLines={1} variant={distance === 0 ? (compact ? 'title' : 'numberMedium') : compact ? 'body' : 'heading'} color={distance === 0 ? 'ink' : distance === 1 ? 'textTertiary' : 'textMuted'}>
      {label}
    </AppText>
  </View>
));
Row.displayName = 'WheelRow';

// 상자 없는 휠: 가운데 줄이 진한 큰 글자, 멀어질수록 연해진다. 위아래로 끝없이 돌릴 수 있다.
export const WheelColumn = ({ items, value, onChange, loop = true, width = 84, accessibilityLabel, compact = false }: WheelColumnProps) => {
  const count = items.length;
  const startIndex = Math.max(0, items.findIndex((item) => item.key === value));
  const base = loop ? Math.floor(REPEAT / 2) * count : 0;
  const total = loop ? count * REPEAT : count;
  const ref = useRef<ScrollViewInstance>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(base + startIndex);
  const [active, setActive] = useState(base + startIndex);

  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: (base + startIndex) * WHEEL_ROW, animated: false }), 0);
    return () => clearTimeout(id);
    // 열릴 때 한 번만 맞춘다(시트가 열릴 때마다 새로 만들어진다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  const show = useCallback((index: number) => {
    if (index !== activeRef.current) {
      activeRef.current = index;
      setActive(index);
    }
  }, []);

  // 멈추면 가장 가까운 줄에 맞추고 값을 알린다. 가장자리에 가까우면 가운데 복사본으로 조용히 옮긴다.
  const settle = useCallback(
    (y: number) => {
      let index = Math.min(total - 1, Math.max(0, Math.round(y / WHEEL_ROW)));
      const item = items[index % count];
      if (loop && (index < count * 2 || index > total - count * 2)) index = base + (index % count);
      if (index * WHEEL_ROW !== Math.round(y)) ref.current?.scrollTo({ y: index * WHEEL_ROW, animated: false });
      show(index);
      if (item !== undefined) onChange(item.key);
    },
    [base, count, items, loop, onChange, show, total],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    show(Math.min(total - 1, Math.max(0, Math.round(y / WHEEL_ROW))));
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => settle(y), 140);
  };

  const pad = WHEEL_ROW * Math.floor(WHEEL_VISIBLE_ROWS / 2);
  const from = Math.max(0, active - RENDER_RADIUS);
  const to = Math.min(total - 1, active + RENDER_RADIUS);
  const rows = [];
  for (let index = from; index <= to; index += 1) {
    rows.push(<Row key={index} label={items[index % count]?.label ?? ''} distance={Math.abs(index - active)} top={index * WHEEL_ROW} compact={compact} />);
  }

  return (
    <View style={{ width, height: WHEEL_ROW * WHEEL_VISIBLE_ROWS }} accessibilityLabel={accessibilityLabel} accessibilityRole="adjustable">
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW}
        decelerationRate="fast"
        scrollEventThrottle={1}
        onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(event) => {
          if (timer.current !== null) clearTimeout(timer.current);
          const y = event.nativeEvent.contentOffset.y;
          timer.current = setTimeout(() => settle(y), 140);
        }}
        onScroll={onScroll}
        contentContainerStyle={{ height: total * WHEEL_ROW + pad * 2 }}
      >
        <View style={{ position: 'absolute', top: pad, left: 0, right: 0, height: total * WHEEL_ROW }}>{rows}</View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, height: WHEEL_ROW, alignItems: 'center', justifyContent: 'center' },
});
