import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader, AppText, Button, Icon, Screen } from '@/components/ui';
import { failuresIn, monthKeyOf } from '@/features/history/evolution';
import { useHistoryStore } from '@/features/history/historyStore';
import { recoveryLeftOf, streakLabelOf, streakOf, todayStateOf } from '@/features/history/streak';
import { MainTabs } from '@/features/navigation/MainTabs';
import { CompletedRow } from '@/features/schedule/components/CompletedRow';
import { CurrentCard } from '@/features/schedule/components/CurrentCard';
import { ExcludedNotice } from '@/features/schedule/components/ExcludedNotice';
import { MissedNotice } from '@/features/schedule/components/MissedNotice';
import { TimelineRow } from '@/features/schedule/components/TimelineRow';
import { usePlanStore } from '@/features/schedule/planStore';
import { missedTasks, resolveNow, upcomingItems } from '@/features/schedule/resolveNow';
import type { PlanTaskItem } from '@/features/schedule/types';
import { useNow } from '@/features/schedule/useNow';
import { useHydrated } from '@/lib/useHydrated';
import { useColors } from '@/theme';
import { dateKeyOf, formatClock, formatDateLabel, secondOfDayOf } from '@/lib/time';

// 세로 막대 색(사용자 요청): 다음 일정에 가까울수록 진하고(검정), 멀리 남은 일정일수록 연하다. 3단계 이후는 가장 연한 색 유지.

const ScheduleScreen = () => {
  const router = useRouter();
  const colors = useColors();
  const hydrated = useHydrated(usePlanStore);
  const plan = usePlanStore((state) => state.plan);
  const startTask = usePlanStore((state) => state.start);
  const startNow = usePlanStore((state) => state.startNow);
  const lateStart = usePlanStore((state) => state.lateStart);
  const skipBreak = usePlanStore((state) => state.skipBreak);
  const clearPlan = usePlanStore((state) => state.clearPlan);
  const setPlan = usePlanStore((state) => state.setPlan);
  const now = useNow();

  const restart = useCallback(() => {
    clearPlan();
    router.replace('/');
  }, [clearPlan, router]);

  // 계획 수정: 아무것도 지우지 않고 "오늘의 계획" 화면으로 간다. 거기서 시간·할 일·쉬는 시간을 고치고
  // [계획 다시 만들기]를 누르면 계획표가 바뀐다(그때 확인창이 뜬다). 예전의 "다시 짜기 = 전부 지우고 1단계부터"는 없앴다.

  const nowSec = secondOfDayOf(now);
  const todayKey = dateKeyOf(now);
  const isToday = plan !== null && plan.dateKey === todayKey;

  const records = useHistoryStore((state) => state.records);
  // "3일 연속 제때 시작 · 회복까지 1일"(달력 화면과 같은 값)
  const streakLabel = useMemo(() => {
    const today = todayStateOf(plan, records, todayKey, nowSec);
    return streakLabelOf(streakOf(records, todayKey, today), recoveryLeftOf(records, todayKey, today));
  }, [records, plan, todayKey, nowSec]);

  const view = useMemo(() => {
    if (plan === null || !isToday) return null;
    const started = new Set(plan.completedTaskIds);
    const startedAt = plan.startedAt ?? {};
    const lateAt = plan.lateStartedAt ?? {};
    const state = resolveNow(plan.items, started, nowSec, new Set(Object.keys(lateAt)));
    // 시작한 일정: 시작한 순서대로(시각이 없는 기록은 일정 순서로 앞에)
    const done = plan.items
      .filter((item): item is PlanTaskItem => item.kind === 'task' && started.has(item.taskId))
      .map((item) => ({ item, at: startedAt[item.taskId] ?? null }))
      .sort((a, b) => (a.at ?? -1) - (b.at ?? -1));
    const missedAll = missedTasks(plan.items, started, nowSec);
    return {
      state,
      done,
      // 이미 시작한 할 일은 "시작한 일정"에만 보여 준다.
      // 휴식은 뒤에 남은(시작 전) 할 일이 있을 때만 보여 준다.
      upcoming: upcomingItems(plan.items, state, nowSec).filter((item) =>
        item.kind === 'task'
          ? !started.has(item.taskId)
          : plan.items.some((later) => later.kind === 'task' && later.startMin >= item.endMin && !started.has(later.taskId)),
      ),
      // 시작하지 못한 일정 = 시작 시각부터 5분이 지났는데 [시작]을 안 누른 일(카드에 보이는 일정은 카드에 있다)
      missed: missedAll.filter((item) => !(state.kind === 'task' && state.item.taskId === item.taskId)),
      // 오늘 실패로 기록될 일(카드에 보이는 것 포함)과 그중 늦게라도 시작한 일 수
      missedCount: missedAll.length,
      // 아직 시작할 수 있는 일(시작도 놓침도 아닌 일)
      remainingCount: plan.items.filter((item) => item.kind === 'task').length - started.size - missedAll.length,
      lateCount: missedAll.filter((item) => lateAt[item.taskId] !== undefined).length,
      lateAt,
    };
  }, [plan, isToday, nowSec]);


  if (!hydrated) return <Screen>{null}</Screen>;

  if (plan === null || view === null) {
    return (
      <Screen bottomBar={<MainTabs active="schedule" />}>
        <AppHeader onPressCalendar={() => router.push('/history')} />
        <View style={styles.empty}>
          <AppText variant="heading">{plan === null ? '계획표가 없어요' : '지난 계획표예요'}</AppText>
          <AppText variant="subtitle" color="textSecondary" style={styles.emptyBody}>
            {plan === null ? '할 일을 정하고 시간표를 만들어 보세요.' : '오늘 할 일로 새 계획을 만들어 보세요.'}
          </AppText>
        </View>
        <Button label="새 계획 만들기" onPress={restart} />
      </Screen>
    );
  }

  return (
    <Screen bottomBar={<MainTabs active="schedule" />}>
      <AppHeader onPressCalendar={() => router.push('/history')} />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.dateRow}>
          <AppText variant="caption" color="dateText">
            {formatDateLabel(now)}
          </AppText>
          {/* 연속으로 제때 시작한 날(달력 화면과 같은 값). 0일이면 숨긴다. */}
          {streakLabel !== null ? (
            <AppText variant="caption" color="textSecondary" style={styles.streakLabel}>
              {streakLabel}
            </AppText>
          ) : null}
        </View>
        <View style={styles.titleRow}>
          <AppText variant="headline" style={styles.title}>
            오늘의 계획표
          </AppText>
        </View>

        <View style={styles.card}>
          <CurrentCard
            state={view.state}
            nowSec={nowSec}
            onStart={startTask}
            onStartNow={startNow}
            onLateStart={lateStart}
            onSkipBreak={skipBreak}
          />
        </View>

        {view.missedCount > 0 ? (
          <View style={styles.missedNotice}>
            <MissedNotice
              count={view.missedCount}
              lateCount={view.lateCount}
              failNo={failuresIn(records, monthKeyOf(todayKey)) + 1}
              remaining={Math.max(0, view.remainingCount)}
            />
          </View>
        ) : null}

        {/* 시작한 일정. 성공은 카드의 [시작] 버튼을 시작 시각부터 5분 안에 눌렀을 때만 기록된다. */}
        {view.done.length > 0 ? (
          <>
            <AppText variant="subtitle" color="textTertiary" style={styles.section}>
              {`시작한 일정 ${view.done.length}`}
            </AppText>
            <View style={styles.rows}>
              {view.done.map(({ item, at }) => (
                <CompletedRow
                  key={`done-${item.taskId}`}
                  item={item}
                  startedAtSec={at}
                  animateIn={at !== null && nowSec - at < 6}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* 휴식 줄은 목록에서 뺀다(할 일만 보이게 단순화). 지금이 휴식이면 위 카드에 보인다. */}
        {view.upcoming.some((item) => item.kind === 'task') ? (
          <>
            <AppText variant="itemTitle" style={styles.section}>
              다음 일정
            </AppText>
            <View style={styles.rows}>
              {view.upcoming.filter((item) => item.kind === 'task').map((item, index) => (
                <TimelineRow
                  key={`${item.kind}-${item.startMin}`}
                  item={item}
                  primary={index === 0}
                />
              ))}
            </View>
          </>
        ) : null}

        {view.missed.length > 0 ? (
          <>
            <AppText variant="subtitle" color="textTertiary" style={styles.section}>
              시작하지 못한 일정
            </AppText>
            <View style={styles.rows}>
              {view.missed.map((item) => (
                <TimelineRow
                  key={`past-${item.taskId}`}
                  item={item}
                  muted
                  note={view.lateAt[item.taskId] === undefined ? undefined : `늦게 시작 ${formatClock(Math.floor((view.lateAt[item.taskId] ?? 0) / 60))}`}
                />
              ))}
            </View>
          </>
        ) : null}

        {plan.excludedTitles.length > 0 ? (
          <View style={styles.excluded}>
            <ExcludedNotice started items={plan.excludedTitles.map((title) => ({ title }))} />
          </View>
        ) : null}

      </ScrollView>

    </Screen>
  );
};

const styles = StyleSheet.create({
  // 화면 여백만큼 밖으로 넓혀 두고 안쪽 여백으로 되돌린다. 그래야 여백 밖으로 나온 글자(다음 일정)가 잘리지 않는다.
  scroll: { flex: 1, marginHorizontal: -24 },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  streakLabel: { flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  dateRow: { marginTop: 22, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  titleRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexShrink: 1 },
  missedNotice: { marginTop: 14 },
  // 완료 효과의 유인원이 아래 목록 위로 떨어지도록 앞에 그린다.
  card: { marginTop: 49, zIndex: 10 },
  // 디자인: "다음 일정" 글자는 화면 여백보다 7pt 바깥(x=17)에서 시작한다.
  section: { marginTop: 36 },
  rows: { marginTop: 6 },
  excluded: { marginTop: 36 },
  empty: { flex: 1, justifyContent: 'center' },
  emptyBody: { marginTop: 8 },
});

export default ScheduleScreen;
