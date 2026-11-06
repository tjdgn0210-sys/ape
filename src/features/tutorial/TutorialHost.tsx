import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Icon, SegmentedControl, TextField } from '@/components/ui';
import { StageIcon } from '@/features/history/components/StageIcon';
import { STAGE_ICON_HEIGHT, imageSizeForInkHeight } from '@/features/history/stages';
import { RunningApe } from '@/features/schedule/components/RunningApe';

import { useSettingsStore } from '@/features/settings/settingsStore';
import { QuickOptions } from '@/features/tasks/components/QuickOptions';
import type { Importance } from '@/features/tasks/types';
import { formatClock12 } from '@/lib/time';
import { useHydrated } from '@/lib/useHydrated';
import { layout, radii, useColors } from '@/theme';

// 처음 쓰는 사용자에게 한 번 보여 주는 사용 방법 안내(사용자 요청: UI를 최소한으로 — 번호·표시·팁 없이).
// 화면에 있는 것: 위의 얇은 진행 막대 + [건너뛰기] 글자, 가운데 그림 하나, 그 아래 제목 한 줄 + 설명 한 줄, 아래 [이전][다음].
// 앱 시작 화면(걷는 유인원)이 끝난 뒤에 뜨고, 설정의 [?]로 다시 볼 수 있다. 내용이 길면(작은 폰·큰 글자) 가운데가 스크롤된다.
const INTRO_WAIT_MS = 2600;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const ENTER_MS = 380; // 튜토리얼이 떠오르는 시간
const EXIT_MS = 420; // 끝낼 때 사라지는 시간(살짝만)

// 1. 쓸 수 있는 시간 — 실제 1단계 화면처럼 좌우로 나뉜 면(검정 / 흰색)
const TimeSlide = () => {
  const colors = useColors();
  const start = formatClock12(10 * 60);
  const end = formatClock12(14 * 60);
  return (
    <View style={styles.timeMock}>
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

// 2. 할 일 — 실제 입력 칸 + 중요도·걸리는 시간(눌러 볼 수 있다)
const TaskSlide = () => {
  const colors = useColors();
  const [importance, setImportance] = useState<Importance>('high');
  const [minutes, setMinutes] = useState(30);
  return (
    <View style={styles.stack}>
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
      <QuickOptions importance={importance} minutes={minutes} onImportance={setImportance} onMinutes={setMinutes} />
    </View>
  );
};

// 3. 쉬는 시간 — 실제 3단계 화면처럼 [자동(추천)|직접] + 일정 스타일 + 총 쉬는 시간(눌러 볼 수 있다)
const BreakSlide = () => {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [style, setStyle] = useState<'focus' | 'balanced' | 'relaxed'>('balanced');
  return (
    <View style={styles.stack}>
      <SegmentedControl
        options={[
          { value: 'auto', label: '자동(추천)' },
          { value: 'manual', label: '직접' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <SegmentedControl
        size="small"
        options={[
          { value: 'focus', label: '빠르게' },
          { value: 'balanced', label: '보통' },
          { value: 'relaxed', label: '여유' },
        ]}
        value={style}
        onChange={setStyle}
      />
      <AppText variant="subtitle" color="textSecondary" style={styles.centerText}>
        총 쉬는 시간 {style === 'focus' ? 15 : style === 'balanced' ? 25 : 40}분
      </AppText>
    </View>
  );
};

// 4. 시작 — 실제 계획표 카드처럼. 안내 문구가 깜빡이고, 누른 듯 파동이 퍼진다.
const StartSlide = () => {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.15, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    const wave = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(ring, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    blink.start();
    wave.start();
    return () => {
      blink.stop();
      wave.stop();
    };
  }, [pulse, ring]);
  return (
    <View style={[styles.startCard, { backgroundColor: colors.cardBg }]}>
      <View pointerEvents="none" style={styles.ringBox}>
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: colors.onCard,
              opacity: ring.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.55, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) }],
            },
          ]}
        />
      </View>
      <AppText variant="cardTitle" color="onCard" numberOfLines={1}>
        공부
      </AppText>
      <Animated.View style={[styles.startHint, { opacity: pulse }]}>
        <AppText variant="subtitle" color="onCardMuted" style={styles.centerText}>
          {'아무 곳이나 누르면\n일정이 시작돼요'}
        </AppText>
      </Animated.View>
      <View style={styles.startBottom}>
        <AppText variant="caption" color="onCardMuted" numberOfLines={1} style={styles.startLabel}>
          시작 마감까지
        </AppText>
        <AppText variant="numberMedium" color="onCard">
          05:00
        </AppText>
      </View>
      <View style={styles.startBar}>
        <View style={[styles.startTrack, { backgroundColor: colors.cardTrack }]} />
        <View style={styles.startApe}>
          <RunningApe effort={0.3} moving color={colors.onCard} width={20} />
        </View>
      </View>
    </View>
  );
};

// 5. 퇴화 — 다섯 단계
const DevolveSlide = () => (
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
);

// 6. 회복 — 3일 연속 모두 시작하면 한 단계 돌아온다
const RecoverSlide = () => {
  const colors = useColors();
  return (
    <View style={styles.recoverRow}>
      {[1, 2, 3].map((day) => (
        <View key={day} style={[styles.recoverDay, { backgroundColor: colors.doneCard }]}>
          <AppText variant="heading" color="onDone">
            {day}
          </AppText>
        </View>
      ))}
      <Icon name="arrowRight" size={22} color="textSecondary" />
      <StageIcon stage={1} imageSize={imageSizeForInkHeight(1, STAGE_ICON_HEIGHT[1] ?? 34)} tint="ink" />
    </View>
  );
};

type Slide = { Illustration: () => React.JSX.Element; title: string; desc: string };
const SLIDES: Slide[] = [
  { Illustration: TimeSlide, title: '계획을 실행할 수 있는 시간', desc: '오늘 쓸 수 있는 시작과 종료 시각을 정해요.' },
  { Illustration: TaskSlide, title: '진짜 할 수 있는 일만', desc: '할 일을 적고 중요도와 걸리는 시간을 골라요.' },
  { Illustration: BreakSlide, title: '쉬는 시간 정하기', desc: '할 일 사이의 쉬는 시간을 정해요.' },
  { Illustration: StartSlide, title: '시간이 되면 카드를 눌러요', desc: '시작 시각부터 5분 안에 누르면 성공이에요.' },
  { Illustration: DevolveSlide, title: '못 하면 한 단계씩 퇴화', desc: '한 달에 5번 실패하면 그 달은 끝나요.' },
  { Illustration: RecoverSlide, title: '3일 연속 성공하면 회복', desc: '이번 달 실패 1번이 지워져요.' },
];
const SLIDE_COUNT = SLIDES.length;

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

  // 보일 때 살짝 떠오르고, 끝낼 때(마지막 [시작하기]·[건너뛰기]) 앞으로 살짝 다가오며 사라진다 — 앱이 시작되는 느낌(사용자 요청: 너무 딱딱함).
  const shown = ready && !seen && introDone;
  const appear = useRef(new Animated.Value(0)).current; // 0 → 1 보이는 정도
  const closing = useRef(false);
  useEffect(() => {
    if (!shown) return;
    closing.current = false;
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: ENTER_MS, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [shown, appear]);

  if (!shown) return null;

  const { Illustration, title, desc } = SLIDES[index] ?? SLIDES[0]!;
  const last = index === SLIDE_COUNT - 1;
  const finish = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(appear, { toValue: 0, duration: EXIT_MS, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }).start(() => setSeen(true));
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={finish}>
      <Animated.View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom + 9, 16),
            opacity: appear,
            // 사라질 때 살짝 커지며(앞으로 다가오며) 열린다. 처음 나타날 때는 반대로 살짝 작은 데서 커진다.
            transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }],
          },
        ]}
      >
        <View style={styles.top}>
          {/* 얇은 진행 막대: 지금 장면까지 검게 */}
          <View style={styles.progress} accessibilityLabel={`${index + 1} / ${SLIDE_COUNT}`}>
            {SLIDES.map((_, dot) => (
              <View key={dot} style={[styles.progressDot, { backgroundColor: dot <= index ? colors.ink : colors.line }]} />
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="건너뛰기" hitSlop={12} onPress={finish} style={styles.skip}>
            <AppText variant="label" color="textTertiary">
              건너뛰기
            </AppText>
          </Pressable>
        </View>

        {/* 가운데: 그림 하나 + 제목 + 설명. 내용이 길거나 화면이 작으면 스크롤된다(잘리지 않게). */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.illustration}>
            <Illustration />
          </View>
          <View style={styles.caption}>
            <AppText variant="heading" style={styles.centerText}>
              {title}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.centerText}>
              {desc}
            </AppText>
          </View>
        </ScrollView>

        <View style={styles.controls}>
          {index > 0 ? <Button variant="gray" label="이전" onPress={() => setIndex((prev) => Math.max(0, prev - 1))} style={styles.prev} /> : null}
          <Button
            label={last ? '시작하기' : '다음'}
            onPress={last ? finish : () => setIndex((prev) => Math.min(SLIDE_COUNT - 1, prev + 1))}
            style={styles.nextButton}
          />
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.screenMargin, width: '100%', maxWidth: 520, alignSelf: 'center' },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 16 },
  progress: { flex: 1, flexDirection: 'row', gap: 5 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  skip: { paddingVertical: 8 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16, gap: 32 },
  illustration: { alignSelf: 'stretch' },
  caption: { gap: 8, alignItems: 'center' },
  centerText: { textAlign: 'center', ...(Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as object) : null) },
  stack: { gap: 16 },
  controls: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', paddingTop: 8 },
  prev: { width: 104 },
  nextButton: { flex: 1 },
  mockAdd: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // 1. 시간
  timeMock: { height: 140, flexDirection: 'row', borderRadius: 24, overflow: 'hidden' },
  timeHalf: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  timeRow: { marginTop: 4, flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  timeNumber: { fontSize: 30, lineHeight: 38 },

  // 4. 시작
  startCard: { height: 188, borderRadius: radii.card, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, overflow: 'hidden' },
  startHint: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  startBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  startLabel: { flexShrink: 1, marginBottom: 8 },
  startBar: { height: 4, marginTop: 8 },
  startTrack: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, borderRadius: 2 },
  startApe: { position: 'absolute', left: '12%', top: -19 },
  ringBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 260, height: 260, borderRadius: 130, borderWidth: 3 },

  // 5·6. 퇴화·회복
  devolveRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 64 },
  devolveCell: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  recoverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 64 },
  recoverDay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
