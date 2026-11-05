import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BottomSheet, Button } from '@/components/ui';
import { WheelColumn, type WheelItem } from '@/features/schedule/components/WheelColumn';

type DatePickerSheetProps = {
  visible: boolean;
  // 지금 보고 있는 날짜(달력에서 고른 날)
  year: number;
  month: number;
  day: number;
  // 고를 수 있는 연도 범위
  minYear: number;
  maxYear: number;
  onClose: () => void;
  onConfirm: (year: number, month: number, day: number) => void;
};

const MONTHS: readonly WheelItem[] = Array.from({ length: 12 }, (_, i) => ({ key: i + 1, label: `${i + 1}월` }));
const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();

// 년·월·일을 스크롤 휠로 골라 그 날짜로 바로 이동한다(사용자 요청). 월·일은 끝없이 돌고, 달마다 다른 일 수에 맞춘다.
export const DatePickerSheet = ({ visible, year, month, day, minYear, maxYear, onClose, onConfirm }: DatePickerSheetProps) => {
  const [parts, setParts] = useState({ year, month, day });
  // 열 때마다 휠을 새로 만들어 위치를 맞춘다.
  const [openCount, setOpenCount] = useState(0);
  const latest = useRef(parts);
  latest.current = parts;

  useEffect(() => {
    if (!visible) return;
    setParts({ year, month, day });
    setOpenCount((count) => count + 1);
  }, [visible, year, month, day]);

  const years = useMemo<WheelItem[]>(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({ key: minYear + i, label: `${minYear + i}년` })),
    [minYear, maxYear],
  );
  const dayCount = daysIn(parts.year, parts.month);
  const days = useMemo<WheelItem[]>(() => Array.from({ length: dayCount }, (_, i) => ({ key: i + 1, label: `${i + 1}일` })), [dayCount]);
  const safeDay = Math.min(parts.day, dayCount);

  const confirm = useCallback(() => {
    const { year: y, month: m, day: d } = latest.current;
    onConfirm(y, m, Math.min(d, daysIn(y, m)));
  }, [onConfirm]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <AppText variant="body" color="textTertiary">
          날짜 선택
        </AppText>
        <AppText variant="heading" accessibilityLiveRegion="polite">{`${parts.year}년 ${parts.month}월 ${safeDay}일`}</AppText>
      </View>
      <View style={styles.wheels} key={openCount}>
        <WheelColumn items={years} value={parts.year} loop={false} compact width={112} accessibilityLabel="년" onChange={(next) => setParts((p) => ({ ...p, year: next }))} />
        <WheelColumn items={MONTHS} value={parts.month} compact width={90} accessibilityLabel="월" onChange={(next) => setParts((p) => ({ ...p, month: next }))} />
        {/* 달마다 일 수가 달라서, 일 수가 바뀌면 휠을 새로 만든다. */}
        <WheelColumn key={`days-${dayCount}`} items={days} value={safeDay} compact width={90} accessibilityLabel="일" onChange={(next) => setParts((p) => ({ ...p, day: next }))} />
      </View>
      <Button label="확인" onPress={confirm} />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wheels: { marginVertical: 10, flexDirection: 'row', justifyContent: 'space-between' },
});
