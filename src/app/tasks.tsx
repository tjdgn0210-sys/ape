import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';

import { AppText, Button, Chip, Icon, Screen, TextField } from '@/components/ui';
import { showConfirm } from '@/features/confirm/confirmStore';
import { suggestionsFor, type FrequentTask } from '@/features/frequent/frequent';
import { useFrequentStore } from '@/features/frequent/frequentStore';
import { MainTabs } from '@/features/navigation/MainTabs';
import { StepFooter } from '@/features/plan/StepFooter';
import { StepHeader } from '@/features/plan/StepHeader';
import { useFlowGate } from '@/features/plan/useFlowGate';
import { usePlanDraft } from '@/features/plan/usePlanDraft';
import { useRoutineStore } from '@/features/routines/routineStore';
import { ALL_DAYS } from '@/features/routines/types';
import { breakPolicyOf } from '@/features/schedule/buildSchedule';
import { useLastPlanStore } from '@/features/schedule/lastPlanStore';
import { usePrefsStore } from '@/features/schedule/prefsStore';
import { overloadOf, timeFitOf } from '@/features/schedule/timeFit';
import { QuickOptions } from '@/features/tasks/components/QuickOptions';
import { TaskRow } from '@/features/tasks/components/TaskRow';
import { TaskSheet } from '@/features/tasks/components/TaskSheet';
import { useTaskStore } from '@/features/tasks/taskStore';
import { DEFAULT_DRAFT, DEFAULT_FORM, IMPORTANCE_ORDER, type Importance, type Task, type TaskForm } from '@/features/tasks/types';
import { formatDuration } from '@/lib/time';
import { dueRoutineTasks } from '@/features/tasks/rollover';
import { layout, useColors } from '@/theme';

type SheetState = { open: boolean; editingId: string | null; initial: TaskForm };

const CLOSED: SheetState = { open: false, editingId: null, initial: DEFAULT_FORM };
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

// 2단계 — 할 일을 적는다. 칸에 글을 쓰기 시작하면 그 아래에 가장 단순한 두 줄이 나온다(사용자 요청):
//   중요도 [높음|보통|낮음], 걸리는 시간 [−] 30분 [+](5분 단위). 안 골라도 보통·30분.
// 엔터(또는 +)로 추가하고 키보드는 그대로 남아 연달아 입력할 수 있다. [취소][추가]로 끝낼 수도 있다.
// 목록의 할 일은 눌러 수정, 길게 눌러 삭제.
const TasksStep = () => {
  const router = useRouter();
  const colors = useColors();
  const gate = useFlowGate();
  const { now, startMin, endMin, timeValid } = usePlanDraft();

  const breakMode = usePrefsStore((state) => state.breakMode);
  const manualBreakMin = usePrefsStore((state) => state.manualBreakMin);
  const style = usePrefsStore((state) => state.style);
  const breaks = useMemo(() => breakPolicyOf({ breakMode, manualBreakMin, style }), [breakMode, manualBreakMin, style]);

  const tasks = useTaskStore((state) => state.tasks);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const removeTask = useTaskStore((state) => state.removeTask);
  const addMany = useTaskStore((state) => state.addMany);
  const routines = useRoutineStore((state) => state.routines);
  const addRoutine = useRoutineStore((state) => state.addRoutine);
  const updateRoutine = useRoutineStore((state) => state.updateRoutine);
  const removeRoutine = useRoutineStore((state) => state.removeRoutine);
  const frequent = useFrequentStore((state) => state.items);
  const recordFrequent = useFrequentStore((state) => state.record);
  const forgetFrequent = useFrequentStore((state) => state.forget);
  const lastPlan = useLastPlanStore((state) => state.lastPlan);

  const fit = useMemo(() => timeFitOf(tasks, startMin, endMin, breaks), [tasks, startMin, endMin, breaks]);
  const overload = useMemo(() => overloadOf(tasks.length, fit.needed, fit.available), [tasks.length, fit.needed, fit.available]);
  // 오늘 요일의 반복 할 일 중 아직 목록에 없는 것(다음에 이 줄들이 회색으로 나온다)
  const dueRoutines = useMemo(() => dueRoutineTasks(routines, tasks, now.getDay()), [routines, tasks, now]);
  // 중요도 높은 순으로 위에서 아래로(같으면 입력 순). 위에 있을수록 오늘 꼭 해야 할 일이다.
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => IMPORTANCE_ORDER.indexOf(a.importance) - IMPORTANCE_ORDER.indexOf(b.importance)),
    [tasks],
  );

  // 경고는 화면에 글로 두지 않고, [다음]을 눌렀을 때 팝업으로 알린다.
  const goBreak = () => router.push('/break');
  const pressNext = () => {
    if (!timeValid) {
      showConfirm('시간을 확인해 주세요', '종료 시간은 시작 시간보다 늦어야 해요.', [{ text: '확인' }]);
      return;
    }
    if (tasks.length === 0) {
      showConfirm('할 일이 없어요', '할 일을 하나 이상 적어 주세요.', [{ text: '확인' }]);
      return;
    }
    if (fit.fitCount === 0) {
      showConfirm('이대로는 시작할 수 없어요', `쓸 수 있는 시간(${formatDuration(fit.available)})에 들어가는 할 일이 없어요. 시간을 늘리거나 할 일을 줄여 주세요.`, [{ text: '확인' }]);
      return;
    }
    if (fit.needed > fit.available) {
      showConfirm('시간이 모자라요', `중요도가 낮은 일부터 ${fit.excludedTitles.length}개가 빠져요.\n${fit.excludedTitles.join(', ')}`, [
        { text: '수정', style: 'cancel' },
        { text: '진행', onPress: goBreak },
      ]);
      return;
    }
    if (overload !== null) {
      showConfirm(
        overload.kind === 'many' ? `할 일이 ${overload.count}개예요` : `시간을 ${overload.percent}% 써요`,
        overload.kind === 'many' ? '많이 잡으면 하나라도 놓치기 쉬워요. 오늘 꼭 할 일 3~4개만 남겨 보세요.' : '쉬는 시간이 아주 짧아져요.',
        [
          { text: '수정', style: 'cancel' },
          { text: '진행', onPress: goBreak },
        ],
      );
      return;
    }
    goBreak();
  };

  // ── 할 일 입력
  const [text, setText] = useState('');
  const [importance, setImportance] = useState<Importance>(DEFAULT_DRAFT.importance);
  const [minutes, setMinutes] = useState(DEFAULT_DRAFT.minutes);
  const inputRef = useRef<TextInputInstance>(null);
  const hasText = text.trim().length > 0;
  // 글을 쓰는 동안(칸을 눌렀거나 글이 있을 때)은 아래가 [취소][확인]으로 바뀌어 [이전][다음]을 잘못 누르지 않는다.
  const [focused, setFocused] = useState(false);
  const typing = focused || hasText;
  const showOptions = hasText;
  // 하루 반복: 누르기 전 회색, 누르면 검정. 켜 두고 추가하면 매일 반복 할 일로 저장된다.
  const [repeatDaily, setRepeatDaily] = useState(false);
  const resetDraft = useCallback(() => {
    setText('');
    setImportance(DEFAULT_DRAFT.importance);
    setMinutes(DEFAULT_DRAFT.minutes);
    setRepeatDaily(false);
  }, []);
  const submitText = useCallback(
    (keepKeyboard = true) => {
      const title = text.trim();
      if (title.length === 0) {
        if (!keepKeyboard) Keyboard.dismiss();
        return;
      }
      const draft = { title, importance, minutes };
      const routineId = repeatDaily ? addRoutine(draft, [...ALL_DAYS]) : undefined;
      addTask(draft, routineId);
      recordFrequent(draft);
      resetDraft();
      if (keepKeyboard) {
        // 엔터를 누르면 웹 등에서 입력창이 포커스를 잃을 수 있어서 다음 틱에 다시 준다(키보드가 안 내려가게).
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        Keyboard.dismiss();
        setFocused(false);
      }
    },
    [text, importance, minutes, repeatDaily, addTask, addRoutine, recordFrequent, resetDraft],
  );
  const cancelTyping = useCallback(() => {
    resetDraft();
    Keyboard.dismiss();
    setFocused(false);
  }, [resetDraft]);

  // ── 할 일 고치기(시트)
  const [sheet, setSheet] = useState<SheetState>(CLOSED);
  const closeSheet = useCallback(() => setSheet((prev) => ({ ...prev, open: false })), []);
  const openEdit = useCallback(
    (task: Task) => {
      const days = routines.find((routine) => routine.id === task.routineId)?.days ?? [];
      setSheet({ open: true, editingId: task.id, initial: { title: task.title, importance: task.importance, minutes: task.minutes, days } });
    },
    [routines],
  );
  const saveEdit = useCallback(
    ({ days, ...draft }: TaskForm) => {
      if (sheet.editingId === null) return;
      const current = tasks.find((task) => task.id === sheet.editingId)?.routineId;
      if (days.length === 0) {
        if (current !== undefined) removeRoutine(current);
        updateTask(sheet.editingId, draft, null);
      } else if (current !== undefined) {
        updateRoutine(current, draft, days);
        updateTask(sheet.editingId, draft);
      } else {
        updateTask(sheet.editingId, draft, addRoutine(draft, days));
      }
      closeSheet();
    },
    [sheet.editingId, tasks, updateTask, addRoutine, updateRoutine, removeRoutine, closeSheet],
  );

  const confirmRemove = useCallback(
    (task: Task) => {
      // 반복 할 일도 똑같이 [취소][확인]만 묻는다. 지우는 건 오늘 목록의 이 할 일뿐이고, 반복 자체는 설정에서 지운다.
      showConfirm('삭제할까요?', task.title, [
        { text: '취소', style: 'cancel' },
        { text: '확인', style: 'destructive', onPress: () => removeTask(task.id) },
      ]);
    },
    [removeTask],
  );

  // 전체 지우기: 한 번 더 확인하고 목록을 비운다(반복 할 일은 회색으로 남는다).
  const confirmClearAll = useCallback(() => {
    showConfirm('전체 지우시겠습니까?', '오늘 할 일이 모두 지워져요.\n반복 할 일은 회색으로 남아요.', [
      { text: '취소', style: 'cancel' },
      { text: '확인', style: 'destructive', onPress: () => useTaskStore.getState().replaceAll([]) },
    ]);
  }, []);

  // 시트의 빨간 [삭제]: 시트를 닫고(닫히는 효과가 끝난 뒤) 길게 눌렀을 때와 같은 확인창을 띄운다.
  const deleteEditing = useCallback(() => {
    const task = tasks.find((item) => item.id === sheet.editingId);
    closeSheet();
    if (task !== undefined) setTimeout(() => confirmRemove(task), 260);
  }, [tasks, sheet.editingId, closeSheet, confirmRemove]);

  // 지난 계획의 할 일 불러오기(같은 제목이 이미 있으면 건너뜀). 시간은 1단계에서 정한 그대로 둔다.
  const loadLastPlan = useCallback(() => {
    if (lastPlan === null) return;
    const titles = new Set(useTaskStore.getState().tasks.map((task) => task.title));
    addMany(lastPlan.tasks.filter((task) => !titles.has(task.title)));
  }, [lastPlan, addMany]);

  const suggestions = useMemo(() => suggestionsFor(frequent, tasks.map((task) => task.title)).slice(0, 5), [frequent, tasks]);
  const addFrequent = useCallback(
    ({ title, importance: level, minutes: length }: FrequentTask) => {
      addTask({ title, importance: level, minutes: length });
      recordFrequent({ title, importance: level, minutes: length });
    },
    [addTask, recordFrequent],
  );
  const confirmForget = useCallback(
    (item: FrequentTask) => {
      showConfirm('자주 한 일에서 뺄까요?', item.title, [
        { text: '취소', style: 'cancel' },
        { text: '빼기', style: 'destructive', onPress: () => forgetFrequent(item.title) },
      ]);
    },
    [forgetFrequent],
  );

  if (!gate.ready) return <Screen>{null}</Screen>;
  if (gate.ended) return <Redirect href="/ended" />;

  return (
    <Screen bottomBar={<MainTabs active="tasks" />}>
      <StepHeader step={2} title="오늘 할 일 정하기" onBack={() => router.dismissTo('/')} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextField
          value={text}
          onChangeText={setText}
          placeholder="할 일을 입력하세요"
          inputRef={inputRef}
          returnKeyType="done"
          submitBehavior="submit"
          blurOnSubmit={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => submitText(true)}
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="할 일 추가"
              hitSlop={HIT_SLOP}
              onPress={() => submitText(true)}
              disabled={!hasText}
              style={hasText ? [styles.addButton, { backgroundColor: colors.ink }] : styles.addButton}
            >
              <Icon name="plus" size={12} color={hasText ? 'onInk' : 'textMuted'} />
            </Pressable>
          }
        />

        {/* 쓰는 동안에만: 중요도·걸리는 시간 */}
        {showOptions ? (
          <View style={styles.quick}>
            <QuickOptions importance={importance} minutes={minutes} onImportance={setImportance} onMinutes={setMinutes} />
          </View>
        ) : null}
        {showOptions ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="매일 반복"
            accessibilityState={{ checked: repeatDaily }}
            onPress={() => setRepeatDaily((value) => !value)}
            style={[styles.repeat, { backgroundColor: repeatDaily ? colors.ink : colors.surface }]}
          >
            <Icon name="repeat" size={18} color={repeatDaily ? 'onInk' : 'textTertiary'} />
            <AppText variant="body" color={repeatDaily ? 'onInk' : 'textTertiary'}>
              매일 반복
            </AppText>
          </Pressable>
        ) : null}

        {/* 쓰지 않을 때만: 지난 계획 / 자주 한 일 바로가기 */}
        {!typing && lastPlan !== null && tasks.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`지난 계획의 할 일 불러오기, ${lastPlan.tasks.length}개`}
            onPress={loadLastPlan}
            style={styles.loadRow}
          >
            <Icon name="repeat" size={20} color="textTertiary" />
            <AppText variant="body" color="textSecondary">{`지난 계획 불러오기 · ${lastPlan.tasks.length}`}</AppText>
          </Pressable>
        ) : null}

        {!typing && suggestions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestions}
            contentContainerStyle={styles.chipRow}
          >
            {suggestions.map((item) => (
              <Chip
                key={item.title}
                compact
                label={`${item.title} ${item.minutes}분`}
                onPress={() => addFrequent(item)}
                onLongPress={() => confirmForget(item)}
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.list}>
          {sortedTasks.map((task) => (
            <TaskRow key={task.id} task={task} onPress={openEdit} onLongPress={confirmRemove} />
          ))}
        </View>

        {/* 오늘 요일의 반복 할 일: 목록 맨 아래에 회색으로 보이고, + 를 누르면 목록에 들어가 중요도 순으로 자리를 잡는다. */}
        {dueRoutines.length > 0 && !typing ? (
          <View style={styles.dueList}>
            {dueRoutines.map((item) => (
              <View key={item.routineId} style={styles.dueRow}>
                <Icon name="repeat" size={15} color="textMuted" />
                <AppText variant="title" color="textMuted" numberOfLines={1} style={styles.dueTitle}>
                  {item.title}
                </AppText>
                <AppText variant="body" color="textMuted">
                  {formatDuration(item.minutes)}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} 오늘 할 일에 추가`}
                  hitSlop={HIT_SLOP}
                  onPress={() => addMany([item])}
                  style={[styles.dueAdd, { borderColor: colors.textMuted }]}
                >
                  <Icon name="plus" size={12} color="textTertiary" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* 목록 맨 아래: 이전 기록까지 한꺼번에 지운다. 실수로 누르지 않게 한 번 더 묻는다. 반복 할 일은 지워도 위쪽 회색 줄로 다시 나온다. */}
        {tasks.length > 0 && !typing ? (
          <Pressable accessibilityRole="button" accessibilityLabel="오늘 할 일 전체 지우기" onPress={confirmClearAll} style={styles.clearAll}>
            <Icon name="trash" size={17} color="textTertiary" />
            <AppText variant="subtitle" color="textTertiary">
              전체 지우기
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>

      {typing ? (
        // 글을 쓰는 동안: [취소][추가]. (이전·다음은 쓰기를 마치면 다시 나온다)
        <View style={styles.typingFooter}>
          <Button variant="gray" label="취소" onPress={cancelTyping} style={styles.cancel} />
          <Button label="추가" onPress={() => submitText(false)} disabled={!hasText} style={styles.confirm} />
        </View>
      ) : (
        <StepFooter onPrev={() => router.dismissTo('/')} onNext={pressNext} />
      )}

      <TaskSheet
        visible={sheet.open}
        initial={sheet.initial}
        isNew={false}
        onClose={closeSheet}
        onSave={saveEdit}
        onDelete={sheet.editingId === null ? undefined : deleteEditing}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, marginHorizontal: -layout.screenMargin, marginTop: 22 },
  content: { paddingHorizontal: layout.screenMargin, paddingBottom: 16 },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quick: { marginTop: 10 },
  dueList: { marginTop: 8 },
  clearAll: { marginTop: 24, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dueRow: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dueTitle: { flex: 1 },
  dueAdd: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  typingFooter: { flexDirection: 'row', gap: 10, paddingTop: 8 },
  cancel: { width: 104 },
  confirm: { flex: 1 },
  repeat: { marginTop: 12, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadRow: { marginTop: 16, height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestions: { marginTop: 14, flexGrow: 0 },
  chipRow: { gap: 8 },
  list: { marginTop: 20 },
});

export default TasksStep;
