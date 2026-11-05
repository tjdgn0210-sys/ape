import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BottomSheet, Button } from '@/components/ui';
import { formatClock12 } from '@/lib/time';

import { WheelColumn, type WheelItem } from './WheelColumn';

type TimePickerSheetProps = {
  visible: boolean;
  title: string;
  // 하루 중 분(0~1439)
  value: number;
  onClose: () => void;
  onConfirm: (minuteOfDay: number) => void;
};

// 끝없이 돌아가는 휠 세 개: [오전/오후] [시 1~12] [분 00~59]. 위아래로 밀어 고르고 [확인].
const PERIODS: readonly WheelItem[] = [
  { key: 0, label: '오전' },
  { key: 1, label: '오후' },
];
const HOURS: readonly WheelItem[] = Array.from({ length: 12 }, (_, i) => ({ key: i + 1, label: String(i + 1) }));
const MINUTES: readonly WheelItem[] = Array.from({ length: 60 }, (_, i) => ({ key: i, label: String(i).padStart(2, '0') }));

const split = (minuteOfDay: number) => {
  const hour24 = Math.floor(minuteOfDay / 60);
  return { period: hour24 >= 12 ? 1 : 0, hour: hour24 % 12 === 0 ? 12 : hour24 % 12, minute: minuteOfDay % 60 };
};
const join = (period: number, hour: number, minute: number) => ((hour % 12) + period * 12) * 60 + minute;

export const TimePickerSheet = ({ visible, title, value, onClose, onConfirm }: TimePickerSheetProps) => {
  const [parts, setParts] = useState(split(value));
  // 열 때마다 휠을 새로 만들어 위치를 다시 맞춘다.
  const [openCount, setOpenCount] = useState(0);
  const latest = useRef(parts);
  latest.current = parts;

  useEffect(() => {
    if (!visible) return;
    setParts(split(value));
    setOpenCount((count) => count + 1);
  }, [visible, value]);

  const confirm = useCallback(() => onConfirm(join(latest.current.period, latest.current.hour, latest.current.minute)), [onConfirm]);
  const clock = formatClock12(join(parts.period, parts.hour, parts.minute));

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <AppText variant="body" color="textTertiary">
          {title}
        </AppText>
        <AppText variant="numberMedium" accessibilityLiveRegion="polite">
          {`${clock.period} ${clock.text}`}
        </AppText>
      </View>
      <View style={styles.wheels} key={openCount}>
        <WheelColumn items={PERIODS} value={parts.period} loop={false} width={96} accessibilityLabel="오전 오후" onChange={(period) => setParts((p) => ({ ...p, period }))} />
        <WheelColumn items={HOURS} value={parts.hour} width={96} accessibilityLabel="시" onChange={(hour) => setParts((p) => ({ ...p, hour }))} />
        <WheelColumn items={MINUTES} value={parts.minute} width={96} accessibilityLabel="분" onChange={(minute) => setParts((p) => ({ ...p, minute }))} />
      </View>
      <Button label="확인" onPress={confirm} />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wheels: { marginVertical: 10, flexDirection: 'row', justifyContent: 'space-between' },
});
