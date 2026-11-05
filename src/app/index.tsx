import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui';
import { showConfirm } from '@/features/confirm/confirmStore';
import { MainTabs } from '@/features/navigation/MainTabs';
import { StepFooter } from '@/features/plan/StepFooter';
import { StepHeader } from '@/features/plan/StepHeader';
import { useFlowGate } from '@/features/plan/useFlowGate';
import { usePlanDraft } from '@/features/plan/usePlanDraft';
import { TimePickerSheet } from '@/features/schedule/components/TimePickerSheet';
import { TimeRangeCard } from '@/features/schedule/components/TimeRangeCard';
import { usePlanStore } from '@/features/schedule/planStore';
import { dateKeyOf, formatDuration, minuteOfDayOf } from '@/lib/time';

type PickerTarget = 'start' | 'end' | null;

// 오늘 계획이 있으면 계획표로 보내는 건 앱을 처음 열 때 한 번만 한다(그래야 하단 탭으로 이 화면에 돌아와 계획을 고칠 수 있다).
let launchRedirectChecked = false;

// 1단계 — 오늘 쓸 수 있는 시간(시작·종료)만 정한다. [다음] → 2단계 할 일 → 3단계 쉬는 시간 → 계획표.
// 누를 곳: 시작, 종료, [다음] (그리고 아래 탭).
const TimeStep = () => {
  const router = useRouter();
  const gate = useFlowGate();
  const { now, startMin, endMin, available, timeValid, setDraft } = usePlanDraft();
  const hasTodayPlan = usePlanStore((state) => state.plan?.dateKey) === dateKeyOf(now);
  const [picker, setPicker] = useState<PickerTarget>(null);
  // 마지막으로 누른 쪽이 검은 면이 된다(처음에는 시작).
  const [active, setActive] = useState<'start' | 'end'>('start');

  // 시작은 지금보다 이를 수 없다.
  const confirmTime = (minuteOfDay: number) => {
    if (picker === 'start') setDraft({ startMin: Math.max(minuteOfDay, minuteOfDayOf(new Date())), endMin });
    else setDraft({ startMin, endMin: minuteOfDay });
    setPicker(null);
  };

  const goNext = () => {
    // 지금 시각으로 맞춘 시작을 저장해 두고 넘어간다(그 사이 시작 시각이 지났으면 지금으로).
    const from = Math.max(startMin, minuteOfDayOf(new Date()));
    if (endMin <= from) {
      showConfirm('시간을 확인해 주세요', '종료 시간은 시작 시간보다 늦어야 해요.', [{ text: '확인' }]);
      return;
    }
    setDraft({ startMin: from, endMin });
    router.push('/tasks');
  };

  // 저장된 계획표를 읽기 전에는 빈 화면, 오늘 계획이 있으면 앱을 처음 열 때만 바로 계획표로 보낸다(깜빡임 방지).
  if (!gate.ready) return <Screen>{null}</Screen>;
  // 이번 달 5번째 실패가 나면 새 계획을 만들 수 없다.
  if (gate.ended) return <Redirect href="/ended" />;
  if (!launchRedirectChecked) {
    launchRedirectChecked = true;
    if (hasTodayPlan) return <Redirect href="/schedule" />;
  }

  return (
    <Screen bottomBar={<MainTabs active="tasks" />}>
      <View style={styles.body}>
        <StepHeader step={1} title="오늘 쓸 수 있는 시간" quiet note={timeValid ? `총 ${formatDuration(available)}` : undefined} />
        <View style={styles.card}>
          <TimeRangeCard
            startMin={startMin}
            endMin={endMin}
            available={available}
            active={active}
            onPressStart={() => {
              setActive('start');
              setPicker('start');
            }}
            onPressEnd={() => {
              setActive('end');
              setPicker('end');
            }}
          />
        </View>
      </View>

      <StepFooter onNext={goNext} />

      <TimePickerSheet
        visible={picker !== null}
        title={picker === 'end' ? '종료 시간' : '시작 시간'}
        value={picker === 'end' ? endMin : startMin}
        onClose={() => setPicker(null)}
        onConfirm={confirmTime}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1 },
  // 화면 좌우 여백을 뚫고 가로 전체를 쓴다(반으로 나눈 흰색/검정이 화면 끝까지 닿게).
  card: { flex: 1, marginTop: 20, marginBottom: 12, marginHorizontal: -24 },
});

export default TimeStep;
