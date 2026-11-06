import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type ViewInstance } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { useColors } from '@/theme';
import { formatClock, formatTimer } from '@/lib/time';

import type { NowState } from '../resolveNow';
import { RunningApe } from './RunningApe';
import { useFlyStore } from '../flyStore';
import { useStartEffectStore } from '../startEffectStore';

const APE_WIDTH = 20; // 유인원 그림 폭(높이 약 19pt). "남은 시간" 글자(바 위 약 23pt)를 가리지 않는 크기
const APE_HEIGHT = APE_WIDTH * (700 / 740);

// 계획을 시작할 때: 유인원이 카드 위쪽에서 떨어져 진행 바에 꽂히고(살짝 튕김), 카드가 쿵 하고 눌린다.
const DROP_FROM = -200; // 카드 안쪽 위 끝보다 위(카드가 잘라 준다)
const DROP_DELAY_MS = 350; // 화면이 옆으로 넘어오는 동안은 기다린다
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const useStartDrop = () => {
  const [armed] = useState(() => useStartEffectStore.getState().armed);
  // 떨어지는 동안만 카드 밖(위쪽)을 잘라 낸다. 끝나면 완료 효과의 유인원이 카드 밖으로 나갈 수 있게 푼다.
  const [clipping, setClipping] = useState(armed);
  const fall = useRef(new Animated.Value(armed ? DROP_FROM : 0)).current;
  const thud = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!armed) return;
    const animation = Animated.sequence([
      Animated.delay(DROP_DELAY_MS),
      Animated.timing(fall, {
        toValue: 0,
        duration: 480,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      // 땅에 박히는 순간: 카드가 눌리고 유인원이 한 번 튕긴다.
      Animated.parallel([
        Animated.sequence([
          Animated.timing(thud, { toValue: 5, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(thud, { toValue: 0, duration: 200, easing: Easing.out(Easing.back(2)), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
        Animated.sequence([
          Animated.timing(fall, { toValue: -14, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(fall, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      ]),
    ]);
    animation.start(({ finished }) => {
      if (!finished) return;
      useStartEffectStore.getState().disarm();
      setClipping(false);
    });
    return () => animation.stop();
  }, [armed, fall, thud]);

  return { fall, thud, clipping };
};

// [시작]을 누르면 유인원이 화면 전체 위로 날아간다(FlyingApeHost, flight.ts).
// 각도는 무작위, 마감(5분)까지 많이 남기고 일찍 누를수록 세게·많이 돌며 날아간다.

// 진행 바 위 유인원의 걸음(RunningApe): 다리·팔을 번갈아 움직이며 걷고, 시간이 줄어들수록 뛴다.
// effort(0~1): 진행 절반 전은 인트로와 같은 걷기(0.3), 절반 이후 조금씩 빠르게(0.3→0.5),
// 남은 시간이 5분 이하면 뛰기(0.6)에서 시작해 2분 이하에서 전력 질주(1)까지 점점 빨라진다. 휴식 중에는 천천히 걷는다.
const RUN_FROM_SEC = 5 * 60;
const FULL_RUN_SEC = 2 * 60;

// 기본 걸음(WALK_BASE)은 앱 시작 화면의 걸음과 같은 세기다(사용자 요청: 인트로와 동일한 걸음).
const WALK_BASE = 0.3;

const effortOf = (state: NowState, progress: number | null, seconds: number | null): number => {
  if (progress === null || seconds === null) return WALK_BASE;
  if (state.kind === 'break') return WALK_BASE;
  if (state.kind !== 'task' || state.status === 'missed') return WALK_BASE;
  if (progress >= 0.5 && seconds <= RUN_FROM_SEC) {
    return 0.6 + 0.4 * Math.min(1, Math.max(0, (RUN_FROM_SEC - seconds) / (RUN_FROM_SEC - FULL_RUN_SEC)));
  }
  return progress < 0.5 ? WALK_BASE : WALK_BASE + (0.5 - WALK_BASE) * ((progress - 0.5) / 0.5);
};

const isWalking = (state: NowState) => (state.kind === 'task' && state.status !== 'missed') || state.kind === 'break';

// 1초마다 바뀌는 진행률을 1초에 걸쳐 부드럽게 따라가게 해서 유인원이 뚝뚝 끊기지 않고 걸어간다.
const useSmoothProgress = (progress: number) => {
  const value = useRef(new Animated.Value(progress)).current;
  const last = useRef(progress);

  useEffect(() => {
    // 일정이 바뀌어 뒤로 가거나 크게 건너뛰면 바로 옮긴다.
    if (progress < last.current || progress - last.current > 0.2) {
      value.setValue(progress);
    } else {
      Animated.timing(value, { toValue: progress, duration: 1000, easing: Easing.linear, useNativeDriver: false }).start();
    }
    last.current = progress;
  }, [progress, value]);

  return value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
};

// 시작해서(성공) 초록으로 바뀌는 순간의 효과:
// 1) [시작] 버튼 자리(오른쪽 위)에서 초록 원이 퍼지며 카드를 채운다 2) 카드가 살짝 커졌다 돌아온다
// 3) 체크 배지가 빙글 돌며 튀어나온다. 화면을 처음 열 때 이미 완료 상태면 효과 없이 바로 초록이다.
const useDoneTransition = (done: boolean) => {
  const fill = useRef(new Animated.Value(done ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const badge = useRef(new Animated.Value(done ? 1 : 0)).current;
  const wasDone = useRef(done);

  useEffect(() => {
    if (done === wasDone.current) return;
    wasDone.current = done;
    if (!done) {
      // 다음 일정으로 넘어갈 때 초록이 오른쪽 위로 빠르게 걷힌다.
      badge.setValue(0);
      Animated.timing(fill, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }).start();
      return;
    }
    fill.setValue(0);
    badge.setValue(0);
    Animated.parallel([
      Animated.timing(fill, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.04, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
      Animated.sequence([
        Animated.delay(260),
        Animated.spring(badge, { toValue: 1, friction: 4, tension: 120, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    ]).start();
  }, [done, fill, pop, badge]);

  return { fill, pop, badge };
};

type CardView = {
  title: string;
  range: string;
  label: string | null;
  // 남은 초. null이면 타이머를 숨긴다.
  seconds: number | null;
  progress: number | null;
  // 카드 오른쪽 위 버튼: 시작할 시간이 된 할 일 = [시작], 시작 전 = [지금 시작], 5분을 놓친 할 일 = [늦었어도 시작], 휴식 = [건너뛰기]
  action: 'start' | 'now' | 'late' | 'skip' | null;
  // 타이머 대신 보여 줄 한 줄(시작을 못 한 일정)
  note?: string;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const viewOf = (state: NowState, nowSec: number): CardView => {
  if (state.kind === 'finished') {
    return { title: '오늘 일정 끝', range: `시작 ${state.done}/${state.total}`, label: null, seconds: null, progress: null, action: null };
  }

  const range = `${formatClock(state.item.startMin)} - ${formatClock(state.item.endMin)}`;
  const title = state.item.kind === 'task' ? state.item.title : '휴식';

  switch (state.kind) {
    case 'task': {
      if (state.status === 'missed') {
        return { title, range, label: null, seconds: null, progress: null, action: 'late', note: '시작 시간이 지났어요' };
      }
      if (state.status === 'pending') {
        // 시작 시각부터 5분 동안: 마감까지 줄어드는 시간. 바는 마감을 향해 걷는다.
        const span = state.deadlineSec - state.startSec;
        return {
          title,
          range,
          label: '시작 마감까지',
          seconds: state.deadlineSec - nowSec,
          progress: clamp01((nowSec - state.startSec) / span),
          action: 'start',
        };
      }
      return {
        title,
        range,
        label: '남은 시간',
        seconds: state.endSec - nowSec,
        progress: clamp01((nowSec - state.startSec) / (state.endSec - state.startSec)),
        action: null,
        ...(state.status === 'late' ? { note: '늦게 시작했어요 · 실패는 그대로예요' } : {}),
      };
    }
    case 'break':
      return {
        title,
        range,
        label: '남은 시간',
        seconds: state.endSec - nowSec,
        progress: clamp01((nowSec - state.startSec) / (state.endSec - state.startSec)),
        action: 'skip',
      };
    case 'before':
      return {
        title,
        range,
        label: '시작까지',
        seconds: state.endSec - nowSec,
        progress: 0,
        // 첫 일정이 할 일일 때만 미리 시작할 수 있다.
        action: state.item.kind === 'task' ? 'now' : null,
      };
  }
};

// 카드 내용이 다른 일정으로 바뀌면 새 내용이 오른쪽에서 밀려 들어온다(사용자 요청: 다음 일정이 카드에 들어오는 모션).
const useEnterOnChange = (key: string) => {
  const enter = useRef(new Animated.Value(1)).current;
  const lastKey = useRef(key);
  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [key, enter]);
  return {
    opacity: enter,
    transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
  };
};

type CurrentCardProps = {
  state: NowState;
  nowSec: number;
  // [시작]을 누른 시각(하루 중 초). 시작 시각부터 5분 안에 누르면 성공으로 기록된다.
  onStart: (taskId: string, atSec: number) => void;
  // [지금 시작]: 시작 시각 전에 미리 시작한다(일정을 지금으로 당긴다).
  onStartNow: (atSec: number) => void;
  // [늦었어도 시작]: 5분이 지난 뒤 누른다(성공은 아니고 기록만 남는다).
  onLateStart: (taskId: string, atSec: number) => void;
  // [건너뛰기]: 지금 휴식을 끝내고 일정을 앞당긴다. 다음 할 일은 지금부터 5분 안에 [시작]을 눌러야 성공이다.
  onSkipBreak: (atSec: number) => void;
};

// 글자 크기 설정에 따라 카드가 커질 수 있어서 위치를 고정하지 않고 위에서부터 쌓는다.
// 보통 크기에서는 디자인(높이 185)과 같다.
export const CurrentCard = ({ state, nowSec, onStart, onStartNow, onLateStart, onSkipBreak }: CurrentCardProps) => {
  const colors = useColors();
  const view = viewOf(state, nowSec);
  const percent = useSmoothProgress(view.progress ?? 0);
  const { fall, thud, clipping } = useStartDrop();
  const effort = effortOf(state, view.progress, view.seconds);
  const cardRef = useRef<ViewInstance>(null);
  const launch = useFlyStore((s) => s.launch);
  // 일정을 구분하는 값(휴식을 건너뛰면 일정 시각이 앞당겨지므로 시각이 아니라 할 일 id로 구분한다)
  const itemKey =
    state.kind === 'finished' ? 'finished' : state.item.kind === 'task' ? `task-${state.item.taskId}` : `break-${state.item.startMin}`;
  // 시작한 일정에서는 유인원이 이미 날아가 버렸으므로 바만 움직인다(시작을 누른 순간 날아간다).
  const started = state.kind === 'task' && state.status === 'running';
  // 휴식 중에는 유인원이 걸을 필요가 없어서 그리지 않고 바만 움직인다(사용자 요청).
  const apeHidden = started || state.kind === 'break';
  // 시작할 일정이 있는 카드(시작 마감 / 시작 전 / 놓침)는 시작 버튼만 크게 둔다(사용자 요청: 시작하는 느낌이 나게).
  const bigAction = view.action === 'start' || view.action === 'now' || view.action === 'late';
  // 시작하기 전(시작 마감 중·시작 시각 전)에는 카드 아무 곳이나 눌러도 시작된다(사용자 요청). 놓친 일정([늦었어도 시작])은 실수로 누르지 않게 버튼만.
  const tapStart = view.action === 'start' || view.action === 'now';
  // 안내 문구가 투명해졌다 돌아오기를 반복한다.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!tapStart) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.15, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [tapStart, pulse]);
  // 누른 자리에서 퍼지는 파동(링 두 개) + 초록 확산의 시작점
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  // 시작한 일정(또는 오늘 일을 모두 제때 시작함)이면 카드가 초록색이 되고 제목 옆에 체크가 붙는다.
  const done = started || (state.kind === 'finished' && state.total > 0 && state.done === state.total);
  const enterStyle = useEnterOnChange(itemKey);
  // 오늘 일정이 모두 끝난 카드
  const finished =
    state.kind === 'finished'
      ? { done: state.done, total: state.total, allDone: state.total > 0 && state.done === state.total }
      : null;

  const { fill: doneFill, pop, badge } = useDoneTransition(done);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  // 오른쪽 위에서 카드의 먼 모서리까지 닿는 원(지름 = 대각선의 2배)
  const ripple = 2 * Math.hypot(cardSize.width, cardSize.height) + 40;
  const mutedColor = done ? 'onDoneMuted' : 'onCardMuted';

  const startWave = (point: { x: number; y: number } | null) => {
    setOrigin(point);
    ringA.setValue(0);
    ringB.setValue(0);
    Animated.parallel([
      Animated.timing(ringA, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.sequence([
        Animated.delay(160),
        Animated.timing(ringB, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    ]).start();
  };

  const launchApe = () => {
    const progress = view.progress ?? 0;
    // 카드의 화면 위치를 재서 바 위 유인원 자리에서 날린다. 일찍 누를수록(마감까지 많이 남을수록) 세게 날아간다.
    cardRef.current?.measureInWindow((x, y, width, height) => {
      launch({
        x: x + CARD_PADDING_X + progress * (width - CARD_PADDING_X * 2) - APE_WIDTH / 2,
        y: y + height - CARD_PADDING_BOTTOM - BAR_HEIGHT - APE_HEIGHT * 0.9686,
        width: APE_WIDTH,
        power: 1 - progress,
      });
    });
  };

  // 오른쪽 위 버튼 하나가 상태에 따라 다른 일을 한다.
  const press = () => {
    if (view.action === 'skip') return onSkipBreak(nowSec);
    if (view.action === 'now') {
      launchApe();
      return onStartNow(nowSec);
    }
    if (state.kind !== 'task') return;
    if (view.action === 'start' && state.status === 'pending') {
      launchApe();
      onStart(state.item.taskId, nowSec);
    } else if (view.action === 'late' && state.status === 'missed') {
      onLateStart(state.item.taskId, nowSec);
    }
  };

  // 시작 버튼(키보드·화면 읽기 도구)으로 눌렀을 때는 오른쪽 위에서 퍼진다. 카드를 직접 누르면 누른 자리에서 퍼진다.
  const pressButton = () => {
    if (tapStart) startWave(null);
    press();
  };
  const pressCard = (event: GestureResponderEvent) => {
    // 앱은 locationX/Y, 웹은 offsetX/Y(오버레이가 카드 전체라 카드 안 좌표와 같다)
    const ne = event.nativeEvent as unknown as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number };
    const x = ne.locationX ?? ne.offsetX;
    const y = ne.locationY ?? ne.offsetY;
    startWave(typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null);
    press();
  };
  const fillOrigin = origin ?? { x: Math.max(0, cardSize.width - 52), y: 38 };

  return (
    <Animated.View
      ref={cardRef}
      onLayout={(event) => setCardSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      style={[
        styles.root,
        { overflow: clipping ? 'hidden' : 'visible', transform: [{ translateY: thud }, { scale: pop }] },
      ]}
    >
      {/* 카드 배경: 검은 바탕 위에 초록 원이 퍼진다(카드 모양 밖은 잘라 낸다). */}
      <View pointerEvents="none" style={[styles.background, { backgroundColor: colors.cardBg }]}>
        <Animated.View
          style={{
            position: 'absolute',
            width: ripple,
            height: ripple,
            borderRadius: ripple / 2,
            left: fillOrigin.x - ripple / 2,
            top: fillOrigin.y - ripple / 2,
            backgroundColor: colors.doneCard,
            opacity: doneFill.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: doneFill }],
          }}
        />
        {origin !== null
          ? [ringA, ringB].map((ring, index) => (
              <Animated.View
                key={index}
                style={{
                  position: 'absolute',
                  width: ripple,
                  height: ripple,
                  borderRadius: ripple / 2,
                  left: origin.x - ripple / 2,
                  top: origin.y - ripple / 2,
                  borderWidth: 3,
                  borderColor: colors.onCard,
                  opacity: ring.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.55, 0] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) }],
                }}
              />
            ))
          : null}
      </View>
      {/* 내용만 움직인다: 다음 일정으로 바뀌면 오른쪽에서 밀려 들어온다. */}
      <Animated.View style={[styles.content, enterStyle]}>
      {finished !== null ? (
        // 오늘 일정 끝: 가운데 정렬, 모두 완료면 큰 체크(사용자 요청: 완료가 분명하게)
        <View style={styles.finished}>
          {finished.allDone ? (
            <Animated.View
              accessibilityLabel="모두 제때 시작"
              style={[
                styles.bigBadge,
                {
                  backgroundColor: colors.onDone,
                  transform: [
                    { scale: badge },
                    { rotate: badge.interpolate({ inputRange: [0, 1], outputRange: ['-120deg', '0deg'] }) },
                  ],
                },
              ]}
            >
              <Icon name="checkmark" size={34} color="doneCard" />
            </Animated.View>
          ) : null}
          <AppText variant="cardTitle" color="onCard" style={styles.finishedTitle}>
            오늘 일정 끝
          </AppText>
          <AppText variant="subtitle" color={mutedColor} style={styles.finishedSub}>
            {finished.allDone ? `모두 제때 시작했어요 · ${finished.done}/${finished.total}` : `시작 ${finished.done}/${finished.total}`}
          </AppText>
        </View>
      ) : (
      <>
      {/* 시작하기 전(tapStart)에는 일정 이름·시각 줄·시작 버튼을 모두 뺀다(사용자 요청). 안내 문구·타이머·바만 남는다. */}
      {tapStart ? null : (
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <AppText variant="cardTitle" color="onCard" numberOfLines={1} style={styles.titleText}>
              {view.title}
            </AppText>
            {done ? (
              <Animated.View
                accessibilityLabel="시작함"
                style={[
                  styles.checkBadge,
                  {
                    backgroundColor: colors.onCard,
                    transform: [
                      { scale: badge },
                      { rotate: badge.interpolate({ inputRange: [0, 1], outputRange: ['-120deg', '0deg'] }) },
                    ],
                  },
                ]}
              >
                <Icon name="checkmark" size={18} color="doneCard" />
              </Animated.View>
            ) : null}
          </View>
          <AppText variant="numberSmall" color={mutedColor} style={styles.range}>
            {view.range}
          </AppText>
        </View>
        {view.action !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ACTION_LABEL[view.action]}
            onPress={pressButton}
            style={[styles.startButton, bigAction && styles.startButtonBig, { backgroundColor: colors.onCard }]}
          >
            <AppText variant={view.action === 'start' ? 'heading' : bigAction ? 'body' : 'subtitle'} color="cardBg" numberOfLines={1}>
              {ACTION_TEXT[view.action]}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      )}

      <View style={tapStart ? styles.hintSpacer : styles.spacer}>
        {tapStart ? (
          <Animated.View style={{ opacity: pulse }}>
            <AppText variant="subtitle" color={mutedColor} numberOfLines={2} style={styles.hintText}>
              박스 안에서 아무 곳이나 누르면 시작돼요
            </AppText>
          </Animated.View>
        ) : null}
      </View>

      {view.note !== undefined ? (
        <AppText variant="subtitle" color={mutedColor} style={styles.note}>
          {view.note}
        </AppText>
      ) : null}

      {view.seconds !== null ? (
        <View style={styles.timerRow}>
          {view.label !== null ? (
            <AppText variant="caption" color={mutedColor} style={styles.label}>
              {view.label}
            </AppText>
          ) : null}
          <AppText
            variant="numberLarge"
            color="onCard"
            accessibilityLabel={`${view.label} ${formatTimer(view.seconds)}`}
          >
            {formatTimer(view.seconds)}
          </AppText>
        </View>
      ) : null}

      {view.progress !== null ? (
        <View style={styles.bar}>
          <View style={[styles.track, { backgroundColor: done ? colors.doneTrack : colors.cardTrack }]} />
          <Animated.View style={[styles.fill, { width: percent, backgroundColor: done ? colors.doneFill : colors.cardFill }]} />
          {/* 위치(JS 구동)와 떨어지기(네이티브)를 서로 다른 View에 둔다. 한 View에 섞으면 오류가 난다. */}
          {apeHidden ? null : (
            <Animated.View style={[styles.ape, { left: percent }]}>
              <Animated.View style={{ transform: [{ translateY: fall }] }}>
                <RunningApe effort={effort} moving={isWalking(state)} color={colors.onCard} width={APE_WIDTH} />
              </Animated.View>
            </Animated.View>
          )}
        </View>
      ) : null}
      </>
      )}
      </Animated.View>
      {/* 시작하기 전에는 카드 전체가 누르는 곳(맨 위에 투명하게 덮는다). 누른 자리를 알려 파동의 중심으로 쓴다. */}
      {tapStart ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view.action === null ? '시작' : `${view.title} ${ACTION_LABEL[view.action]}`}
          onPress={pressCard}
          style={styles.tapLayer}
        />
      ) : null}
    </Animated.View>
  );
};

const ACTION_TEXT = { start: '시작', now: '지금 시작', late: '늦었어도 시작', skip: '건너뛰기' } as const;
const ACTION_LABEL = { start: '시작', now: '지금 시작', late: '늦었어도 시작', skip: '휴식 건너뛰고 다음 일정 시작' } as const;

const CARD_RADIUS = 20;
const CARD_PADDING_X = 20;
const CARD_PADDING_BOTTOM = 22;
const BAR_HEIGHT = 4;

const styles = StyleSheet.create({
  root: { minHeight: 185, borderRadius: CARD_RADIUS, paddingHorizontal: CARD_PADDING_X, paddingTop: 21, paddingBottom: CARD_PADDING_BOTTOM },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleBlock: { flex: 1, paddingLeft: 1 },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CARD_RADIUS, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleText: { flexShrink: 1 },
  checkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  range: { marginTop: 4 },
  startButton: {
    height: 34,
    minWidth: 64,
    paddingHorizontal: 16,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시작할 일정이 있는 카드의 시작 버튼만 크게(사용자 요청: 사진 모양 그대로, 버튼만 약 1.6배).
  startButtonBig: { height: 54, minWidth: 104, paddingHorizontal: 26, borderRadius: 27 },
  content: { flexGrow: 1 },
  tapLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CARD_RADIUS },
  hintSpacer: { flex: 1, minHeight: 64, justifyContent: 'center' },
  hintText: { textAlign: 'center' },
  finished: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  bigBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  finishedTitle: { textAlign: 'center' },
  finishedSub: { marginTop: 6, textAlign: 'center' },
  spacer: { flex: 1, minHeight: 8 },
  note: { paddingLeft: 4 },
  // 글자 가운데가 아니라 아래쪽 기준으로 라벨과 타이머를 맞춘다(디자인: 라벨이 타이머 글자 아래쪽 근처).
  timerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 4,
    paddingRight: 6,
  },
  label: { marginBottom: 12 },
  bar: { height: 4, marginTop: 11 },
  track: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, borderRadius: 2 },
  fill: { position: 'absolute', left: 0, top: 0, height: 4, borderRadius: 2 },
  // 발이 진행 바 위에 닿도록 그림 높이의 96.9% 지점(발바닥)을 바 위쪽에 맞춘다.
  ape: { position: 'absolute', top: -APE_HEIGHT * 0.9686, width: APE_WIDTH, height: APE_HEIGHT, marginLeft: -APE_WIDTH / 2 },
});
