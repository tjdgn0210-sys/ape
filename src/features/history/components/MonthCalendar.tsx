import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText, Icon } from '@/components/ui';
import { useColors } from '@/theme';

import { buildMonthGrid, dateKeyFor } from '../calendar';
import { failuresIn, stageIndexFor } from '../evolution';
import { STAGE_ICON_HEIGHT, imageSizeForInkHeight } from '../stages';
import type { Records } from '../types';

import { StageIcon } from './StageIcon';


const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
// 칸은 달력 폭을 7등분한다(사용자 요청: 양옆으로 넓게). 날짜는 지름 36 원 안에 둔다.
const CELL_HEIGHT = 46;
const DAY_CIRCLE = 36;
const MARK_FALLBACK_HEIGHT = 28;

type MonthCalendarProps = {
  year: number;
  month: number;
  selectedKey: string;
  records: Records;
  onSelect: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  // 달 제목을 눌렀을 때(날짜 선택 시트를 연다)
  onPressTitle: () => void;
  // 이 날의 실패 아이콘을 위에서 떨어뜨려 쾅 박는다. 끝나면 onSlamEnd.
  slamKey?: string | null;
  onSlamEnd?: () => void;
  // 아직 확정 전이지만 못 지킨 것이 거의 확실한 날(오늘, 계획 시간이 끝났고 미완료가 있음)
  pendingKey?: string | null;
  // 계획을 아예 안 짠 날이면 true. 날짜 밑에 작은 회색 점을 찍는다(실패가 아니라서 그림은 없다).
  isSkipped?: (dateKey: string) => boolean;
};

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const SLAM_DELAY_MS = 450; // 화면이 넘어오는 동안 기다린다
const SLAM_FROM_Y = -240;
const SLAM_FROM_SCALE = 3.2;

type SlamAnim = { drop: Animated.Value; squash: Animated.Value; ring: Animated.Value; shake: Animated.Value };

// 떨어지기(가속) → 박히는 순간 납작해졌다 돌아오기 + 충격 원 퍼짐 + 달력 전체 흔들림.
const useSlam = (active: boolean, onEnd: (() => void) | undefined): SlamAnim => {
  const drop = useRef(new Animated.Value(active ? 0 : 1)).current;
  const squash = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!active) return;
    drop.setValue(0);
    ring.setValue(0);
    const t = (value: Animated.Value, toValue: number, duration: number, easing = Easing.linear) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: USE_NATIVE_DRIVER });
    const animation = Animated.sequence([
      Animated.delay(SLAM_DELAY_MS),
      t(drop, 1, 430, Easing.in(Easing.cubic)),
      Animated.parallel([
        Animated.sequence([t(squash, 0.55, 60, Easing.out(Easing.quad)), t(squash, 1, 260, Easing.out(Easing.back(3)))]),
        t(ring, 1, 450, Easing.out(Easing.cubic)),
        Animated.sequence([t(shake, 7, 45), t(shake, -6, 55), t(shake, 4, 55), t(shake, -2, 55), t(shake, 0, 55)]),
      ]),
    ]);
    animation.start(({ finished }) => {
      if (finished) onEndRef.current?.();
    });
    return () => animation.stop();
  }, [active, drop, squash, ring, shake]);

  return { drop, squash, ring, shake };
};

const SlamMark = ({ stage, anim }: { stage: number; anim: SlamAnim }) => {
  const colors = useColors();
  const translateY = anim.drop.interpolate({ inputRange: [0, 1], outputRange: [SLAM_FROM_Y, 0] });
  const scale = anim.drop.interpolate({ inputRange: [0, 1], outputRange: [SLAM_FROM_SCALE, 1] });
  const opacity = anim.drop.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] });
  const ringScale = anim.ring.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.4] });
  const ringOpacity = anim.ring.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.8, 0] });
  // 납작해질 때 옆으로 퍼진다.
  const squashX = anim.squash.interpolate({ inputRange: [0.55, 1], outputRange: [1.35, 1] });

  return (
    <View style={styles.mark} pointerEvents="none">
      <Animated.View
        style={[styles.ring, { borderColor: colors.ink, opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />
      <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
        <Animated.View style={{ transform: [{ scaleX: squashX }, { scaleY: anim.squash }] }}>
          <StageIcon stage={stage} imageSize={markSize(stage)} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// 실패한 날 = 그날로 퇴화한 단계의 그림(그 달 k번째 실패 = 단계 k, 4번째 이후 = 유인원).
// 날짜 숫자 자리에 그린다. 크기는 위 단계 줄의 그림과 같다(사용자 요청: 현대인 최대 → 갈수록 작게, STAGE_ICON_HEIGHT).
const markSize = (stage: number) => imageSizeForInkHeight(stage, STAGE_ICON_HEIGHT[stage] ?? MARK_FALLBACK_HEIGHT);

// forgiven = 실패했지만 이후 연속 성공으로 실패 횟수에서 지워진 날(흐린 그림으로 남는다)
type DayKind = 'plain' | 'success' | 'fail' | 'forgiven' | 'pending';

const dayKindOf = (records: Records, dateKey: string, pending: boolean): DayKind => {
  const record = records[dateKey];
  if (record === undefined) return pending ? 'pending' : 'plain';
  if (record.result === 'success') return 'success';
  return record.forgivenOn === undefined ? 'fail' : 'forgiven';
};

// 실패한 날의 그림 단계(확정 전이면 다음에 될 단계)
const failStageOf = (records: Records, dateKey: string, kind: DayKind) =>
  kind === 'pending'
    ? stageIndexFor(failuresIn(records, dateKey.slice(0, 7)) + 1)
    : stageIndexFor(records[dateKey]?.failNo ?? 1);

type DayCellProps = {
  day: number;
  month: number;
  dateKey: string;
  selected: boolean;
  records: Records;
  pending: boolean;
  skipped: boolean;
  slam: SlamAnim | null;
  onSelect: (dateKey: string) => void;
};

const SKIP_DOT = 6;

const DayCell = ({ day, month, dateKey, selected, records, pending, skipped, slam, onSelect }: DayCellProps) => {
  const colors = useColors();
  const kind = dayKindOf(records, dateKey, pending);
  const hasApe = kind === 'fail' || kind === 'forgiven' || kind === 'pending';
  const status =
    kind === 'success'
      ? ' 모두 제때 시작'
      : kind === 'fail'
        ? ' 못 지킴'
        : kind === 'forgiven'
          ? ' 못 지켰지만 연속 성공으로 회복됨'
          : kind === 'pending'
            ? ' 자정에 실패로 확정될 예정'
            : skipped
              ? ' 계획 없음'
              : '';

  // 완료한 날 = 숫자를 초록 원으로 감싼다. 고른 날 = 검은 원(완료·실패한 날은 검은 테두리).
  const fill = kind === 'success' ? colors.doneCard : selected && !hasApe ? colors.ink : 'transparent';
  const textColor = kind === 'success' ? 'onDone' : selected ? 'onInk' : 'dayText';
  const ring = selected && kind !== 'plain' ? colors.ink : null;
  const stage = hasApe ? failStageOf(records, dateKey, kind) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${month}월 ${day}일${status}`}
      accessibilityState={{ selected }}
      onPress={() => onSelect(dateKey)}
      style={styles.cell}
    >
      <View style={styles.circle}>
        {/* 원은 SVG로 그린다. 안드로이드에서 View의 borderRadius가 적용되지 않아 네모로 보이는 경우가 있어서(사용자 지적). */}
        {fill !== 'transparent' || ring !== null ? (
          <Svg width={DAY_CIRCLE} height={DAY_CIRCLE} style={styles.circleShape} pointerEvents="none">
            {fill !== 'transparent' ? <Circle cx={DAY_CIRCLE / 2} cy={DAY_CIRCLE / 2} r={DAY_CIRCLE / 2} fill={fill} /> : null}
            {ring !== null ? (
              <Circle cx={DAY_CIRCLE / 2} cy={DAY_CIRCLE / 2} r={DAY_CIRCLE / 2 - 1} fill="none" stroke={ring} strokeWidth={2} />
            ) : null}
          </Svg>
        ) : null}
        {hasApe ? (
          slam !== null ? (
            <SlamMark stage={stage} anim={slam} />
          ) : (
            <StageIcon stage={stage} imageSize={markSize(stage)} opacity={kind === 'pending' || kind === 'forgiven' ? 0.35 : 1} />
          )
        ) : (
          <AppText variant="calendarDay" color={textColor} maxFontSizeMultiplier={1} style={styles.dayText}>
            {day}
          </AppText>
        )}
      </View>
      {/* 계획을 안 짠 날 = 날짜 밑에 작은 회색 점(원은 SVG로 그린다). 고른 날은 검은 원 위라 점을 숨긴다. */}
      {skipped && kind === 'plain' && !selected ? (
        <Svg width={SKIP_DOT} height={SKIP_DOT} style={styles.skipDot} pointerEvents="none">
          <Circle cx={SKIP_DOT / 2} cy={SKIP_DOT / 2} r={SKIP_DOT / 2} fill={colors.textHint} />
        </Svg>
      ) : null}
      {/* 유인원이 숫자 자리를 차지하므로 날짜는 오른쪽 아래 작은 숫자로 남긴다. */}
      {hasApe ? (
        <View style={[styles.dayBadge, { backgroundColor: colors.background }]} pointerEvents="none">
          <AppText variant="calendarDay" color="textTertiary" maxFontSizeMultiplier={1} style={styles.dayBadgeText}>
            {day}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
};

export const MonthCalendar = ({
  year,
  month,
  selectedKey,
  records,
  onSelect,
  onPrevMonth,
  onNextMonth,
  onPressTitle,
  slamKey = null,
  onSlamEnd,
  pendingKey = null,
  isSkipped,
}: MonthCalendarProps) => {
  const weeks = buildMonthGrid(year, month);
  const monthPrefix = dateKeyFor(year, month, 1).slice(0, 8);
  const slamActive = slamKey !== null && slamKey.startsWith(monthPrefix) && records[slamKey]?.result === 'fail';
  const slam = useSlam(slamActive, onSlamEnd);

  return (
    <View>
      <View style={styles.monthRow}>
        {/* 제목을 누르면 년·월·일을 스크롤로 골라 바로 이동한다. 오른쪽 작은 ▾는 눌러지는 칸이라는 표시. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${year}년 ${month}월, 눌러서 날짜 선택`}
          onPress={onPressTitle}
          style={styles.titlePress}
        >
          <AppText variant="heading">{`${year}년 ${month}월`}</AppText>
          <View style={styles.down}>
            <Icon name="chevronRight" size={11} color="textTertiary" />
          </View>
        </Pressable>
        <View style={styles.arrows}>
          <Pressable accessibilityRole="button" accessibilityLabel="이전 달" hitSlop={4} onPress={onPrevMonth} style={styles.arrowButton}>
            <View style={styles.flip}>
              <Icon name="chevronRight" size={18} color="ink" />
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="다음 달" hitSlop={4} onPress={onNextMonth} style={styles.arrowButton}>
            <Icon name="chevronRight" size={18} color="ink" />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((weekday) => (
          <AppText key={weekday} variant="caption" color="textHint" style={styles.weekday}>
            {weekday}
          </AppText>
        ))}
      </View>

      <Animated.View style={[styles.grid, { transform: [{ translateX: slam.shake }] }]}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => {
              if (day === null) return <View key={dayIndex} style={styles.cell} />;
              const dateKey = dateKeyFor(year, month, day);
              return (
                <DayCell
                  key={dayIndex}
                  day={day}
                  month={month}
                  dateKey={dateKey}
                  selected={dateKey === selectedKey}
                  records={records}
                  pending={dateKey === pendingKey}
                  skipped={isSkipped?.(dateKey) ?? false}
                  slam={slamActive && dateKey === slamKey ? slam : null}
                  onSelect={onSelect}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  monthRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titlePress: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  down: { transform: [{ rotate: '90deg' }] },
  arrowButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  arrows: { flexDirection: 'row', alignItems: 'center', marginRight: -10 },
  flip: { transform: [{ scaleX: -1 }] },
  // 요일·날짜 칸은 달력 폭을 7등분해서 양옆 끝까지 쓴다(사용자 요청: 오른쪽 여백이 너무 큼).
  weekdays: { flexDirection: 'row', marginTop: 17 },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { marginTop: 10 },
  week: { flexDirection: 'row', height: CELL_HEIGHT },
  cell: { flex: 1, height: CELL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  circle: { width: DAY_CIRCLE, height: DAY_CIRCLE, alignItems: 'center', justifyContent: 'center' },
  circleShape: { position: 'absolute', left: 0, top: 0 },
  // 글자 크기 설정과 상관없이 원 안에 들어가게 크기를 고정한다.
  dayText: { fontSize: 15, lineHeight: 18, includeFontPadding: false, textAlign: 'center' },
  dayBadge: { position: 'absolute', right: '50%', bottom: 1, marginRight: -24, minWidth: 14, paddingHorizontal: 2, borderRadius: 7, alignItems: 'center' },
  dayBadgeText: { fontSize: 9, lineHeight: 11, includeFontPadding: false, textAlign: 'center' },
  skipDot: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  mark: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2 },
});
