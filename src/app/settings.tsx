import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { showConfirm } from '@/features/confirm/confirmStore';
import { resetAll } from '@/features/settings/resetAll';
import { AppText, Button, Icon, Screen, SegmentedControl, Slider } from '@/components/ui';
import { TimePickerSheet } from '@/features/schedule/components/TimePickerSheet';
import { useFrequentStore } from '@/features/frequent/frequentStore';
import { useRoutineStore } from '@/features/routines/routineStore';
import { describeDays, type Routine } from '@/features/routines/types';
import { TaskSheet } from '@/features/tasks/components/TaskSheet';
import { useTaskStore } from '@/features/tasks/taskStore';
import { DEFAULT_FORM, type TaskForm } from '@/features/tasks/types';
import { formatClock } from '@/lib/time';
import {
  FONT_SIZE_LABEL,
  FONT_SIZE_ORDER,
  THEME_LABEL,
  THEME_ORDER,
  useSettingsStore,
} from '@/features/settings/settingsStore';
import { layout } from '@/theme';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;
const ON_OFF = [
  { value: 'on', label: '켜기' },
  { value: 'off', label: '끄기' },
] as const;

const SettingsScreen = () => {
  const router = useRouter();
  const theme = useSettingsStore((state) => state.theme);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const morningEnabled = useSettingsStore((state) => state.morningEnabled);
  const morningMinute = useSettingsStore((state) => state.morningMinute);
  const setMorningEnabled = useSettingsStore((state) => state.setMorningEnabled);
  const setMorningMinute = useSettingsStore((state) => state.setMorningMinute);
  const eveningEnabled = useSettingsStore((state) => state.eveningEnabled);
  const setEveningEnabled = useSettingsStore((state) => state.setEveningEnabled);
  const eveningMinute = useSettingsStore((state) => state.eveningMinute);
  const setEveningMinute = useSettingsStore((state) => state.setEveningMinute);
  const frequentCount = useFrequentStore((state) => state.items.length);
  const clearFrequent = useFrequentStore((state) => state.clear);
  const setTutorialSeen = useSettingsStore((state) => state.setTutorialSeen);
  const routines = useRoutineStore((state) => state.routines);
  const removeRoutine = useRoutineStore((state) => state.removeRoutine);
  const addRoutine = useRoutineStore((state) => state.addRoutine);
  const updateRoutine = useRoutineStore((state) => state.updateRoutine);
  const [pickingTime, setPickingTime] = useState(false);
  const [pickingEvening, setPickingEvening] = useState(false);
  // 반복 할 일 편집 시트. editing: null = 새로 만들기
  const [routineSheet, setRoutineSheet] = useState<{ open: boolean; editing: Routine | null }>({
    open: false,
    editing: null,
  });

  const openNewRoutine = () => setRoutineSheet({ open: true, editing: null });
  const openRoutine = (routine: Routine) => setRoutineSheet({ open: true, editing: routine });
  const closeRoutine = () => setRoutineSheet((prev) => ({ ...prev, open: false }));

  // 저장: 새 반복은 규칙만 만든다(오늘 할 일에는 사용자가 + 를 눌러 넣는다).
  // 고친 반복이면 목록에 있는 그 반복의 오늘 할 일도 같이 고친다.
  const saveRoutine = ({ days, ...draft }: TaskForm) => {
    const editing = routineSheet.editing;
    const { tasks, updateTask } = useTaskStore.getState();
    if (editing === null) {
      // 오늘 요일이 들어 있으면 오늘 할 일 목록 맨 아래에 회색으로 나온다(+ 로 추가).
      addRoutine(draft, days);
    } else {
      updateRoutine(editing.id, draft, days);
      tasks.filter((task) => task.routineId === editing.id).forEach((task) => updateTask(task.id, draft));
    }
    closeRoutine();
  };

  const confirmRemoveRoutine = (id: string, title: string) =>
    showConfirm('반복을 지울까요?', `${title}\n목록에 있는 오늘 할 일은 그대로 남아요.`, [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => removeRoutine(id) },
    ]);

  // 앱 전체 초기화. 빨간 버튼 → 다시 묻는 확인창(빨간 [초기화]) → 처음 화면으로.
  // 자주 한 일(바로가기 칩) 기록만 지운다. 할 일·반복·달력 기록은 그대로다.
  const confirmClearFrequent = () =>
    showConfirm('자주 한 일을 모두 초기화할까요?', '바로가기로 뜨던 할 일 기록만 지워져요.', [
      { text: '취소', style: 'cancel' },
      { text: '확인', style: 'destructive', onPress: clearFrequent },
    ]);

  const confirmReset = () =>
    showConfirm('앱을 초기화할까요?', '할 일, 계획표, 달력 기록, 반복 할 일, 설정이 모두 지워지고 처음 상태로 돌아가요. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: () => {
          resetAll();
          router.replace('/');
        },
      },
    ]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로" hitSlop={HIT_SLOP} onPress={() => router.back()}>
          <View style={styles.back}>
            <Icon name="chevronRight" size={12} color="ink" />
          </View>
        </Pressable>
        <AppText variant="title">설정</AppText>
      </View>

      <AppText variant="subtitle" color="textTertiary" style={styles.sectionLabel}>
        화면 모드
      </AppText>
      <View style={styles.segment}>
        <SegmentedControl
          boxed
          size="small"
          options={THEME_ORDER.map((name) => ({ value: name, label: THEME_LABEL[name] }))}
          value={theme}
          onChange={setTheme}
        />
      </View>

      <View style={styles.sizeHead}>
        <AppText variant="subtitle" color="textTertiary">
          글자 크기
        </AppText>
        <AppText variant="body">{FONT_SIZE_LABEL[fontSize]}</AppText>
      </View>
      {/* 가로 바를 밀어 조절: 작게 ~ 아주 크게 네 칸에 붙는다. */}
      <View style={styles.sizeBar}>
        <AppText variant="caption" color="textTertiary">
          가
        </AppText>
        <View style={styles.sizeSlider}>
          <Slider
            min={0}
            max={FONT_SIZE_ORDER.length - 1}
            step={1}
            value={Math.max(0, FONT_SIZE_ORDER.indexOf(fontSize))}
            onChange={(index) => {
              const next = FONT_SIZE_ORDER[index];
              if (next !== undefined && next !== fontSize) setFontSize(next);
            }}
            accessibilityLabel="글자 크기"
          />
        </View>
        <AppText variant="title" color="textTertiary">
          가
        </AppText>
      </View>

      <AppText variant="subtitle" color="textTertiary" style={styles.sectionLabel}>
        아침 계획 알림
      </AppText>
      <View style={styles.segment}>
        <SegmentedControl boxed size="small" options={ON_OFF} value={morningEnabled ? 'on' : 'off'} onChange={(value) => setMorningEnabled(value === 'on')} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`알림 시간 ${formatClock(morningMinute)}`}
        disabled={!morningEnabled}
        onPress={() => setPickingTime(true)}
        style={[styles.timeRow, !morningEnabled && styles.dim]}
      >
        <AppText variant="body">알림 시간</AppText>
        <AppText variant="title">{formatClock(morningMinute)}</AppText>
      </Pressable>
      <AppText variant="subtitle" color="textSecondary" style={styles.rowHint}>
        계획을 아직 안 만든 날에만 알려 줘요.
      </AppText>

      <AppText variant="subtitle" color="textTertiary" style={styles.sectionLabel}>
        저녁 알림
      </AppText>
      <View style={styles.segment}>
        <SegmentedControl boxed size="small" options={ON_OFF} value={eveningEnabled ? 'on' : 'off'} onChange={(value) => setEveningEnabled(value === 'on')} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`저녁 알림 시간 ${formatClock(eveningMinute)}`}
        disabled={!eveningEnabled}
        onPress={() => setPickingEvening(true)}
        style={[styles.timeRow, !eveningEnabled && styles.dim]}
      >
        <AppText variant="body">알림 시간</AppText>
        <AppText variant="title">{formatClock(eveningMinute)}</AppText>
      </Pressable>
      <AppText variant="subtitle" color="textSecondary" style={styles.rowHint}>
        계획을 안 만든 날 정한 시각에 한 번 알려 줘요.
      </AppText>

      <View style={styles.sectionHead}>
        <AppText variant="subtitle" color="textTertiary">반복 할 일</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="반복 할 일 추가"
          hitSlop={HIT_SLOP}
          onPress={openNewRoutine}
          style={styles.addButton}
        >
          <Icon name="plus" size={11} color="ink" />
          <AppText variant="subtitle">추가</AppText>
        </Pressable>
      </View>
      {routines.length === 0 ? (
        <AppText variant="subtitle" color="textSecondary">
          정한 요일마다 할 일에 저절로 들어가요.
        </AppText>
      ) : (
        routines.map((routine) => (
          <View key={routine.id} style={styles.routineRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${routine.title} 반복 고치기`}
              onPress={() => openRoutine(routine)}
              style={styles.routineBody}
            >
              <AppText variant="body" numberOfLines={1}>
                {routine.title}
              </AppText>
              <AppText variant="subtitle" color="textSecondary">
                {`${describeDays(routine.days)} · ${routine.minutes}분`}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${routine.title} 반복 지우기`}
              hitSlop={HIT_SLOP}
              onPress={() => confirmRemoveRoutine(routine.id, routine.title)}
              style={styles.trash}
            >
              <Icon name="trash" size={22} color="textSecondary" />
            </Pressable>
          </View>
        ))
      )}

      <TaskSheet
        visible={routineSheet.open}
        initial={
          routineSheet.editing === null
            ? { ...DEFAULT_FORM, days: [0, 1, 2, 3, 4, 5, 6] }
            : {
                title: routineSheet.editing.title,
                importance: routineSheet.editing.importance,
                minutes: routineSheet.editing.minutes,
                days: routineSheet.editing.days,
              }
        }
        isNew={routineSheet.editing === null}
        requireDays
        onClose={closeRoutine}
        onDelete={
          routineSheet.editing === null
            ? undefined
            : () => {
                const editing = routineSheet.editing;
                closeRoutine();
                if (editing !== null) setTimeout(() => confirmRemoveRoutine(editing.id, editing.title), 260);
              }
        }
        onSave={saveRoutine}
      />


      {/* 튜토리얼 다시 보기: 물음표 아이콘 하나(처음 쓰는 사용자에게만 자동으로 뜬다) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="튜토리얼 다시 보기"
        onPress={() => {
          setTutorialSeen(false);
          router.back();
        }}
        style={styles.helpRow}
      >
        <Icon name="help" size={22} color="ink" />
        <AppText variant="body">튜토리얼</AppText>
      </Pressable>

      <AppText variant="subtitle" color="textTertiary" style={styles.sectionLabel}>
        자주 한 일
      </AppText>
      <AppText variant="subtitle" color="textSecondary">
        {frequentCount > 0 ? `할 일 화면에 바로가기로 뜨는 ${frequentCount}개를 기억하고 있어요.` : '기억하고 있는 자주 한 일이 없어요.'}
      </AppText>
      <Button label="자주 한 일 모두 초기화" variant="gray" disabled={frequentCount === 0} onPress={confirmClearFrequent} style={styles.clearFrequent} />

      <AppText variant="subtitle" color="textTertiary" style={styles.sectionLabel}>
        초기화
      </AppText>
      <AppText variant="subtitle" color="textSecondary">
        모든 기록과 설정을 지우고 처음 상태로 돌아가요.
      </AppText>
      <Button label="초기화" variant="danger" onPress={confirmReset} style={styles.reset} />

      <TimePickerSheet
        visible={pickingTime}
        title="알림 시간"
        value={morningMinute}
        onClose={() => setPickingTime(false)}
        onConfirm={(minute) => {
          setMorningMinute(minute);
          setPickingTime(false);
        }}
      />
      <TimePickerSheet
        visible={pickingEvening}
        title="저녁 알림 시간"
        value={eveningMinute}
        onClose={() => setPickingEvening(false)}
        onConfirm={(minute) => {
          setEveningMinute(minute);
          setPickingEvening(false);
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { height: layout.headerHeight, flexDirection: 'row', alignItems: 'center', gap: 14 },
  // chevronRight를 좌우로 뒤집어 "뒤로" 화살표로 쓴다.
  back: { transform: [{ scaleX: -1 }] },
  sectionLabel: { marginTop: 32, marginBottom: 12 },
  sizeHead: { marginTop: 32, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sizeBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeSlider: { flex: 1 },
  segment: { alignSelf: 'stretch' },
  helpRow: { marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  sectionHead: { marginTop: 36, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
  timeRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dim: { opacity: 0.3 },
  clearFrequent: { marginTop: 14 },
  rowHint: { marginTop: 10 },
  routineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  routineBody: { flex: 1 },
  // 휴지통: 보이는 크기 22pt, 누르는 칸 40pt
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  reset: { marginTop: 14, marginBottom: 12 },
});

export default SettingsScreen;
