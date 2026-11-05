import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText, Screen, SegmentedControl } from '@/components/ui';
import { showConfirm } from '@/features/confirm/confirmStore';
import { MainTabs } from '@/features/navigation/MainTabs';
import { StepFooter } from '@/features/plan/StepFooter';
import { StepHeader } from '@/features/plan/StepHeader';
import { useFlowGate } from '@/features/plan/useFlowGate';
import { usePlanDraft } from '@/features/plan/usePlanDraft';
import { breakPolicyOf, buildSchedule } from '@/features/schedule/buildSchedule';
import { useLastPlanStore } from '@/features/schedule/lastPlanStore';
import { usePlanStore } from '@/features/schedule/planStore';
import { usePrefsStore } from '@/features/schedule/prefsStore';
import { useStartEffectStore } from '@/features/schedule/startEffectStore';
import {
  MANUAL_BREAK,
  STYLE_LABEL,
  STYLE_ORDER,
  type BreakMode,
} from '@/features/schedule/types';
import { usePreviousPlanStore } from '@/features/tasks/previousPlanStore';
import { useTaskStore } from '@/features/tasks/taskStore';
import { dateKeyOf, formatClock12, formatDuration, minuteOfDayOf } from '@/lib/time';
import { layout, useFontScale } from '@/theme';

const MODE_OPTIONS: readonly { value: BreakMode; label: string }[] = [
  { value: 'auto', label: '자동(추천)' },
  { value: 'manual', label: '직접' },
];
const STYLE_OPTIONS = STYLE_ORDER.map((option) => ({ value: option, label: STYLE_LABEL[option] }));

// 3단계 — 쉬는 시간(자동 / 직접). 자동이면 빠르게·보통·여유 중에서 고른다.
// 마지막 [다음]을 누르면 지금 시각을 기준으로 시간표를 짜서 저장하고 계획표로 간다(거기서 시작).
const BreakStep = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const fontScale = useFontScale();
  const gate = useFlowGate();
  const { startMin, endMin, draftStart, timeValid } = usePlanDraft();

  const breakMode = usePrefsStore((state) => state.breakMode);
  const manualBreakMin = usePrefsStore((state) => state.manualBreakMin);
  const style = usePrefsStore((state) => state.style);
  const setPrefs = usePrefsStore((state) => state.setPrefs);
  const prefs = useMemo(() => ({ breakMode, manualBreakMin, style }), [breakMode, manualBreakMin, style]);
  const breaks = useMemo(() => breakPolicyOf(prefs), [prefs]);

  const tasks = useTaskStore((state) => state.tasks);
  const hasTodayPlan = usePlanStore((state) => state.plan?.dateKey) === dateKeyOf(new Date());
  const setPlan = usePlanStore((state) => state.setPlan);

  const result = useMemo(() => buildSchedule({ tasks, startMin, endMin, breaks }), [tasks, startMin, endMin, breaks]);
  const taskCount = result.items.filter((item) => item.kind === 'task').length;
  const breakTotal = result.items.reduce((sum, item) => (item.kind === 'break' ? sum + (item.endMin - item.startMin) : sum), 0);
  const planEnd = result.items.length > 0 ? Math.max(...result.items.map((item) => item.endMin)) : endMin;
  const canStart = timeValid && result.items.length > 0;

  const stepBreak = (delta: number) =>
    setPrefs({ ...prefs, manualBreakMin: Math.min(MANUAL_BREAK.max, Math.max(MANUAL_BREAK.min, manualBreakMin + delta)) });

  // 누르는 순간의 시각으로 시간표를 다시 만들어 저장하고 계획표로 간다.
  const startPlan = () => {
    const pressMin = minuteOfDayOf(new Date());
    const from = Math.max(draftStart, pressMin);
    if (endMin <= from) return;
    const built = buildSchedule({ tasks, startMin: from, endMin, breaks });
    if (built.items.length === 0) return;
    // 다음에 [지난 계획 불러오기]로 쓸 수 있게 이 계획의 모양을 기억한다.
    useLastPlanStore.getState().save({
      spanMin: endMin - from,
      tasks: tasks.map(({ title, importance, minutes }) => ({ title, importance, minutes })),
    });
    // 새 계획을 시작하면 "되살리기"용 보관은 비운다.
    usePreviousPlanStore.getState().clear();
    // 계획표 첫 화면에서 유인원이 떨어지는 효과를 한 번 보여 준다.
    useStartEffectStore.getState().arm();
    setPlan({
      dateKey: dateKeyOf(new Date()),
      items: built.items,
      excludedTitles: built.excluded.map((task) => task.title),
      completedTaskIds: [],
    });
    router.replace('/schedule');
    // 시간이 모자라 뺀 일이 있으면 한 번 더 알려 준다.
    if (built.excluded.length > 0) {
      showConfirm(
        `${built.excluded.length}개는 계획에 들어가지 않았어요`,
        `쓸 수 있는 시간이 모자라 중요도가 낮은 일부터 뺐어요.\n${built.excluded.map((task) => task.title).join(', ')}`,
        [{ text: '확인' }],
      );
    }
  };

  // 오늘 계획이 이미 있으면 바꿀지 한 번 묻는다(시작 기록이 사라진다).
  const pressNext = () => {
    if (!canStart) {
      showConfirm('시작할 수 없어요', !timeValid ? '종료 시간이 시작 시간보다 늦어야 해요.' : '이 시간에는 들어가는 할 일이 없어요. 시간을 늘리거나 할 일을 줄여 주세요.', [{ text: '확인' }]);
      return;
    }
    if (!hasTodayPlan) {
      startPlan();
      return;
    }
    showConfirm('오늘 계획표를 바꿀까요?', '지금 계획표와 시작 기록이 사라져요.', [
      { text: '취소', style: 'cancel' },
      { text: '바꾸기', style: 'destructive', onPress: startPlan },
    ]);
  };


  if (!gate.ready) return <Screen>{null}</Screen>;
  if (gate.ended) return <Redirect href="/ended" />;

  const endClock = formatClock12(planEnd);
  // 결과는 줄바꿈 없이 한 줄로.
  const summary = `쉬는 시간 ${breakTotal > 0 ? formatDuration(breakTotal) : '0분'} · ${endClock.period} ${endClock.text}에 끝나요`;
  // 좁은 폰(320~360pt)에서도 한 줄에 들어가도록 글자를 한 단계 줄인다.
  const narrow = width < 360;

  return (
    <Screen bottomBar={<MainTabs active="tasks" />}>
      <StepHeader step={3} title="쉬는 시간" onBack={() => router.dismissTo('/tasks')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 자동을 먼저, 크게, "추천"과 함께 보여 유도한다. */}
        <View style={styles.section}>
          <SegmentedControl boxed options={MODE_OPTIONS} value={breakMode} onChange={(mode) => setPrefs({ ...prefs, breakMode: mode })} />
        </View>

        {breakMode === 'manual' ? (
          // 직접: 모든 사이에 같은 길이. 가운데 큰 숫자, 양옆 [−][+]
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="쉬는 시간 줄이기"
              disabled={manualBreakMin <= MANUAL_BREAK.min}
              onPress={() => stepBreak(-MANUAL_BREAK.step)}
              style={[styles.stepButton, { opacity: manualBreakMin <= MANUAL_BREAK.min ? 0.25 : 1 }]}
            >
              <AppText variant="display" color="textTertiary">
                −
              </AppText>
            </Pressable>
            <AppText variant="numberLarge" style={styles.stepCenter}>{`${manualBreakMin}분`}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="쉬는 시간 늘리기"
              disabled={manualBreakMin >= MANUAL_BREAK.max}
              onPress={() => stepBreak(MANUAL_BREAK.step)}
              style={[styles.stepButton, { opacity: manualBreakMin >= MANUAL_BREAK.max ? 0.25 : 1 }]}
            >
              <AppText variant="display" color="textTertiary">
                +
              </AppText>
            </Pressable>
          </View>
        ) : (
          // 자동: 빠르게 · 보통 · 여유
          <View style={styles.styleRow}>
            <SegmentedControl boxed size="small" options={STYLE_OPTIONS} value={style} onChange={(option) => setPrefs({ ...prefs, style: option })} />
          </View>
        )}

        {timeValid && taskCount > 0 ? (
          <AppText variant={narrow ? 'subtitle' : 'body'} color="textSecondary" numberOfLines={fontScale > 1.1 ? 2 : 1} accessibilityLiveRegion="polite" style={styles.summary}>
            {summary}
          </AppText>
        ) : null}
      </ScrollView>

      <StepFooter onPrev={() => router.dismissTo('/tasks')} onNext={pressNext} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, marginHorizontal: -layout.screenMargin, marginTop: 8 },
  content: { paddingHorizontal: layout.screenMargin, paddingBottom: 16 },
  section: { marginTop: 28 },
  styleRow: { marginTop: 8 },
  stepper: { marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  stepCenter: { flex: 1, textAlign: 'center' },
  summary: { marginTop: 40, textAlign: 'center' },
});

export default BreakStep;
