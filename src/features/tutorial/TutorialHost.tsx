import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Icon, TextField } from '@/components/ui';
import { StageIcon } from '@/features/history/components/StageIcon';
import { STAGE_ICON_HEIGHT, imageSizeForInkHeight } from '@/features/history/stages';

import { useSettingsStore } from '@/features/settings/settingsStore';
import { QuickOptions } from '@/features/tasks/components/QuickOptions';
import type { Importance } from '@/features/tasks/types';
import { formatClock12 } from '@/lib/time';
import { useHydrated } from '@/lib/useHydrated';
import { layout, radii, useColors } from '@/theme';

// 처음 쓰는 사용자에게 한 번 보여 주는 튜토리얼(사용자 요청: 처음엔 튜토리얼, 그 뒤엔 아이콘만 보고 쓰게).
// 장면 네 개, 말은 장면마다 한 줄. 앱 시작 화면(걷는 유인원)이 끝난 뒤에 뜨고, 설정의 [?]로 다시 볼 수 있다.
const INTRO_WAIT_MS = 2600;
const SLIDE_COUNT = 4;


// 장면 1: 쓸 수 있는 시간을 정한다 — 실제 1단계 화면처럼 좌우로 나뉜 면(검정 / 흰색)
const TimeSlide = () => {
  const colors = useColors();
  const start = formatClock12(10 * 60);
  const end = formatClock12(14 * 60);
  return (
    <View style={[styles.illustration, styles.timeMock]}>
      <View style={[styles.timeHalf, { backgroundColor: colors.ink }]}>
        <AppText variant="subtitle" color="textMuted">
          시작
        </AppText>
        <View style={styles.timeRow}>
          <AppText variant="label" color="onInk">
            {start.period}
          </AppText>
          <AppText variant="numberLarge" color="onInk" style={styles.timeNumber}>
            {start.text}
          </AppText>
        </View>
      </View>
      <View style={[styles.timeHalf, { backgroundColor: colors.surface }]}>
        <AppText variant="subtitle" color="textTertiary">
          종료
        </AppText>
        <View style={styles.timeRow}>
          <AppText variant="label" color="textSecondary">
            {end.period}
          </AppText>
          <AppText variant="numberLarge" style={styles.timeNumber}>
            {end.text}
          </AppText>
        </View>
      </View>
    </View>
  );
};

// 장면 2: 할 일은 진짜 할 수 있는 만큼만(적으면서 중요도·시간을 고른다) — 실제 입력 칸과 같은 모양
const TaskSlide = () => {
  const colors = useColors();
  const [importance, setImportance] = useState<Importance>('high');
  const [minutes, setMinutes] = useState(30);
  return (
    <View style={styles.illustration}>
      <TextField
        value="공부"
        editable={false}
        pointerEvents="none"
        trailing={
          <View style={[styles.mockAdd, { backgroundColor: colors.ink }]}>
            <Icon name="plus" size={12} color="onInk" />
          </View>
        }
      />
      <View style={styles.mockQuick}>
        <QuickOptions importance={importance} minutes={minutes} onImportance={setImportance} onMinutes={setMinutes} />
      </View>
    </View>
  );
};
// 장면 3: 시간이 되면 5분 안에 [시작]만 누르면 성공
const StartSlide = () => {
  const colors = useColors();
  return (
    <View style={styles.illustration}>
      <View style={[styles.startCard, { backgroundColor: colors.cardBg }]}>
        <View>
          <AppText variant="subtitle" color="onCardMuted">
            시작 시간부터
          </AppText>
          <AppText variant="numberMedium" color="onCard">
            5:00
          </AppText>
        </View>
        <View style={[styles.startPill, { backgroundColor: colors.onCard }]}>
          <AppText variant="body" color="cardBg">
            시작
          </AppText>
        </View>
      </View>
    </View>
  );
};

// 장면 4: 못 누르면 한 달에 5번까지, 한 단계씩 퇴화한다
const DevolveSlide = () => (
  <View style={styles.illustration}>
    <View style={styles.devolveRow}>
      {[0, 1, 2, 3, 4].map((stage) => (
        <View key={stage} style={styles.devolveCell}>
          <StageIcon
            stage={stage}
            imageSize={imageSizeForInkHeight(stage, STAGE_ICON_HEIGHT[stage] ?? 30)}
            tint={stage === 0 ? 'ink' : 'textTertiary'}
          />
        </View>
      ))}
    </View>
  </View>
);

const SLIDES = [
  { Illustration: TimeSlide, line: '쓸 수 있는 시간', icon: 'clock' as const },
  { Illustration: TaskSlide, line: '진짜 할 수 있는 일만', icon: 'tabTodo' as const },
  { Illustration: StartSlide, line: '시작 시간 후 5분 안에', sub: '[시작]을 누르면 성공, 놓치면 실패예요.', icon: 'play' as const },
  { Illustration: DevolveSlide, line: '못 하면 한 단계씩 퇴화', sub: '한 달에 5번 실패하면 그 달은 끝나요.', icon: 'warning' as const },
];

export const TutorialHost = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const ready = useHydrated(useSettingsStore);
  const seen = useSettingsStore((state) => state.tutorialSeen);
  const setSeen = useSettingsStore((state) => state.setTutorialSeen);
  const [introDone, setIntroDone] = useState(false);
  const [index, setIndex] = useState(0);

  // 앱 시작 화면이 끝날 때까지 기다린다(한 번만).
  useEffect(() => {
    const id = setTimeout(() => setIntroDone(true), INTRO_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  // 다시 볼 때(설정의 [?])는 처음 장면부터
  useEffect(() => {
    if (!seen) setIndex(0);
  }, [seen]);

  if (!ready || seen || !introDone) return null;

  const { Illustration, line, icon, sub } = (SLIDES[index] ?? SLIDES[0]!) as { Illustration: () => React.JSX.Element; line: string; icon: 'clock' | 'tabTodo' | 'play' | 'warning'; sub?: string };
  const last = index === SLIDE_COUNT - 1;
  const finish = () => setSeen(true);

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={finish}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom + 9, 16) }]}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="건너뛰기" hitSlop={12} onPress={finish}>
            <Icon name="close" size={14} color="textSecondary" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Illustration />
          <View style={styles.caption}>
            <Icon name={icon} size={26} color="ink" />
            <AppText variant="heading" style={styles.line}>
              {line}
            </AppText>
            {sub !== undefined ? (
              <AppText variant="body" color="textSecondary" style={styles.line}>
                {sub}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {SLIDES.map((_, dot) => (
              <View key={dot} style={[styles.dot, { backgroundColor: dot === index ? colors.ink : colors.line }]} />
            ))}
          </View>
          {/* 맨 아래: 회색 [이전] + 검은 [다음]/[시작]. 둘 다 가로 전체를 나눠 쓴다. */}
          <View style={styles.controls}>
            {index > 0 ? (
              <Button variant="gray" label="이전" onPress={() => setIndex((prev) => Math.max(0, prev - 1))} style={styles.prev} />
            ) : null}
            <Button
              label={last ? '시작' : '다음'}
              onPress={last ? finish : () => setIndex((prev) => Math.min(SLIDE_COUNT - 1, prev + 1))}
              style={styles.nextButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.screenMargin, width: '100%', maxWidth: 520, alignSelf: 'center' },
  top: { height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', gap: 36 },
  illustration: { minHeight: 170, justifyContent: 'center' },
  caption: { alignItems: 'center', gap: 10 },
  line: { textAlign: 'center' },
  bottom: { gap: 22, alignItems: 'center', alignSelf: 'stretch' },
  controls: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  prev: { width: 104 },
  nextButton: { flex: 1 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  next: { width: '100%', height: layout.controlHeight, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center' },
  mockAdd: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timeMock: { height: 170, flexDirection: 'row', borderRadius: 28, overflow: 'hidden' },
  timeHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timeRow: { marginTop: 4, flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timeNumber: { fontSize: 34, lineHeight: 42 },
  mockQuick: { marginTop: 12 },
  startCard: { height: 120, borderRadius: radii.card, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startPill: { width: 64, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  devolveRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 60 },
  devolveCell: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
});
