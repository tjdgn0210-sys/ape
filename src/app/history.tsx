import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, AppText } from '@/components/ui';
import { dateKeyFor, shiftMonth } from '@/features/history/calendar';
import { DatePickerSheet } from '@/features/history/components/DatePickerSheet';
import { DayDetail } from '@/features/history/components/DayDetail';
import { MonthCalendar } from '@/features/history/components/MonthCalendar';
import { EvolutionStrip } from '@/features/history/components/EvolutionStrip';
import { failuresIn, isPerfectMonth, tasksOfPlan } from '@/features/history/evolution';
import { useHistoryStore } from '@/features/history/historyStore';
import { isSkippedDay } from '@/features/history/skipped';
import { recoveryLeftOf, streakLabelOf, streakOf, todayStateOf } from '@/features/history/streak';
import { MainTabs } from '@/features/navigation/MainTabs';
import { usePlanStore } from '@/features/schedule/planStore';
import { useNow } from '@/features/schedule/useNow';
import { dateKeyOf, secondOfDayOf } from '@/lib/time';
import { layout, useColors } from '@/theme';

const monthOf = (dateKey: string) => {
  const [year = 0, month = 1] = dateKey.split('-').map(Number);
  return { year, month };
};

const HistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const records = useHistoryStore((state) => state.records);
  const plan = usePlanStore((state) => state.plan);
  const slamKey = useHistoryStore((state) => state.slamKey);
  const clearSlam = useHistoryStore((state) => state.clearSlam);

  const now = useNow(30_000);
  const todayKey = dateKeyOf(now);
  // 방금 실패한 날이 있으면 그날(그 달)을 펼쳐서 유인원이 박히는 모습을 보여 준다.
  const [selectedKey, setSelectedKey] = useState(slamKey ?? todayKey);
  const [shown, setShown] = useState(() => monthOf(slamKey ?? todayKey));

  // 이 화면을 보고 있는 중에 자정이 지나 실패가 확정된 경우
  useEffect(() => {
    if (slamKey === null) return;
    setSelectedKey(slamKey);
    setShown(monthOf(slamKey));
  }, [slamKey]);

  // 날짜를 누르면 그날 결과가 보이도록 아래로 스크롤한다(결과가 화면 아래에 가려져 있을 때).
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [detailY, setDetailY] = useState(0);
  const [scrollRequest, setScrollRequest] = useState(0);
  const selectDay = useCallback((dateKey: string) => {
    setSelectedKey(dateKey);
    setScrollRequest((count) => count + 1);
  }, []);
  // 고른 날의 목록이 그려져 내용 길이가 바뀐 뒤에 스크롤해야 끝까지 내려간다.
  useEffect(() => {
    if (scrollRequest === 0) return;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, detailY - 120), animated: true }), 60);
    return () => clearTimeout(id);
  }, [scrollRequest, detailY]);

  // 달 제목을 누르면 년·월·일을 스크롤로 고르는 시트
  const [pickerOpen, setPickerOpen] = useState(false);
  const confirmDate = useCallback(
    (year: number, month: number, day: number) => {
      setShown({ year, month });
      selectDay(dateKeyFor(year, month, day));
      setPickerOpen(false);
    },
    [selectDay],
  );
  const selectedDay = Number(selectedKey.split('-')[2] ?? 1);

  const prevMonth = useCallback(() => setShown((prev) => shiftMonth(prev.year, prev.month, -1)), []);
  const nextMonth = useCallback(() => setShown((prev) => shiftMonth(prev.year, prev.month, 1)), []);

  // 오늘 시작 시각부터 5분이 지났는데 [시작]을 못 누른 일이 있으면, 자정에 실패로 확정되기 전이라도 흐린 유인원으로 미리 보여 준다.
  const todayState = useMemo(
    () => todayStateOf(plan, records, todayKey, secondOfDayOf(now)),
    [plan, records, todayKey, now],
  );
  const pendingKey = todayState === 'failed' && records[todayKey] === undefined ? todayKey : null;
  // 계획을 아예 안 짠 날(달력의 회색 점). 실패·퇴화에는 영향이 없다.
  const startedKey = useHistoryStore((state) => state.startedKey);
  const planDateKey = plan?.dateKey ?? null;
  const isSkipped = useCallback(
    (dateKey: string) => isSkippedDay(dateKey, { records, startedKey, todayKey, planDateKey }),
    [records, startedKey, todayKey, planDateKey],
  );
  // "3일 연속 제때 시작 · 회복까지 1일"(회복 = 같은 달 연속 3일로 실패 1회 지우기)
  const streakLabel = useMemo(
    () => streakLabelOf(streakOf(records, todayKey, todayState), recoveryLeftOf(records, todayKey, todayState)),
    [records, todayKey, todayState],
  );

  // 보고 있는 달의 실패 횟수. 5번이 되면 그 달은 끝(유인원).
  const shownMonthKey = `${shown.year}-${String(shown.month).padStart(2, '0')}`;
  const failCount = failuresIn(records, shownMonthKey);
  // 이스터에그: 보고 있는 지난 달을 한 번도 빠짐없이 지켰으면 맨 앞에 알파메일이 나타난다.
  const perfectMonth = isPerfectMonth(records, shownMonthKey, todayKey);
  const pendingInMonth = pendingKey !== null && pendingKey.startsWith(shownMonthKey) ? 1 : 0;

  // 확정된 기록이 있으면 그것을, 없으면 오늘 진행 중인 계획표를 보여 준다.
  const tasks = useMemo(() => {
    const record = records[selectedKey];
    if (record !== undefined) return record.tasks;
    return plan !== null && plan.dateKey === selectedKey ? tasksOfPlan(plan) : null;
  }, [records, plan, selectedKey]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.body}>
        <AppHeader onPressCalendar={() => undefined} />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.titleRow}>
          <AppText variant="headline">달력</AppText>
          {/* 연속으로 제때 시작한 날(사용자 요청: 긍정 피드백). 0일이면 숨긴다. */}
          {streakLabel !== null ? (
            <AppText variant="caption" color="textSecondary" style={styles.streakLabel}>
              {streakLabel}
            </AppText>
          ) : null}
        </View>
        <View style={styles.strip}>
          <EvolutionStrip failures={failCount} pending={pendingInMonth === 1} perfect={perfectMonth} />
        </View>

        <View style={styles.calendar}>
          <MonthCalendar
            year={shown.year}
            month={shown.month}
            selectedKey={selectedKey}
            records={records}
            onSelect={selectDay}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onPressTitle={() => setPickerOpen(true)}
            slamKey={slamKey}
            onSlamEnd={clearSlam}
            pendingKey={pendingKey}
            isSkipped={isSkipped}
          />
        </View>

        <View style={styles.detail} onLayout={(event) => setDetailY(event.nativeEvent.layout.y)}>
          <DayDetail dateKey={selectedKey} tasks={tasks} skipped={tasks === null && isSkipped(selectedKey)} />
        </View>
        </ScrollView>
      </View>
      <DatePickerSheet
        visible={pickerOpen}
        year={shown.year}
        month={shown.month}
        day={shownMonthKey === selectedKey.slice(0, 7) ? selectedDay : 1}
        minYear={Math.min(2024, shown.year)}
        maxYear={Math.max(now.getFullYear() + 1, shown.year)}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmDate}
      />
      <MainTabs active="history" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: layout.screenMargin },
  streakLabel: { flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  titleRow: { marginTop: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  strip: { marginTop: 12 },
  calendar: { marginTop: 9 },
  divider: { marginTop: 14 },
  detail: { marginTop: 20 },
  scroll: { flex: 1, marginHorizontal: -layout.screenMargin },
  scrollContent: { paddingHorizontal: layout.screenMargin, paddingBottom: 32 },
});

export default HistoryScreen;
