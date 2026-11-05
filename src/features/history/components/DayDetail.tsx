import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { formatDuration } from '@/lib/time';

import { formatDayTitle } from '../calendar';
import type { DayTask } from '../types';

type DayDetailProps = {
  dateKey: string;
  // null이면 그날은 기록이 없다.
  tasks: readonly DayTask[] | null;
  // 계획을 아예 안 짠 날이면 true(기록이 없는 이유를 알려 준다)
  skipped?: boolean;
};

// 체크박스·구분선 없이: 시작한 일은 진한 글자, 시작하지 못한 일은 흐린 글자 + 취소선.
const TaskLine = ({ task }: { task: DayTask }) => {
  return (
    <View style={styles.row} accessibilityLabel={`${task.title} ${task.done ? '시작 성공' : '시작하지 못함'}`}>
      <AppText
        variant="body"
        color={task.done ? 'ink' : 'textMuted'}
        numberOfLines={1}
        style={[styles.title, !task.done && styles.undone]}
      >
        {task.title}
      </AppText>
      <AppText variant="meta" color="textMuted">
        {task.late === true ? `늦게 시작 · ${formatDuration(task.minutes)}` : formatDuration(task.minutes)}
      </AppText>
    </View>
  );
};

// 고른 날의 결과: 위에 한눈에 보는 요약(성공 n/m, 진행 막대),
// 아래에 "시작한 일"과 "시작하지 못한 일"을 나눠서 보여 준다. 목록은 화면 전체 스크롤을 쓴다(작은 칸 안 스크롤 없음).
export const DayDetail = ({ dateKey, tasks, skipped = false }: DayDetailProps) => {

  if (tasks === null || tasks.length === 0) {
    return (
      <View>
        <AppText variant="label">{formatDayTitle(dateKey)}</AppText>
        <AppText variant="subtitle" color="textMuted" style={styles.empty}>
          {skipped ? '계획이 없었어요. 실패는 아니지만 연속 기록은 끊겨요.' : '이 날은 기록이 없어요.'}
        </AppText>
      </View>
    );
  }

  const done = tasks.filter((task) => task.done);
  const undone = tasks.filter((task) => !task.done);
  const ratio = done.length / tasks.length;

  return (
    <View>
      <AppText variant="label">{formatDayTitle(dateKey)}</AppText>

      {/* 상자·막대 없이 큰 숫자 하나(이 화면에서 가장 강조할 값) */}
      <View style={styles.summary} accessibilityLabel={`시작에 성공한 일 ${done.length}개, 전체 ${tasks.length}개 (${Math.round(ratio * 100)}%)`}>
        <AppText variant="numberLarge">{`${done.length}/${tasks.length}`}</AppText>
        <AppText variant="subtitle" color="textTertiary">
          시작에 성공한 일
        </AppText>
      </View>

      {done.length > 0 ? (
        <>
          <AppText variant="caption" color="textTertiary" style={styles.group}>
            {`시작한 일 ${done.length}`}
          </AppText>
          {done.map((task, index) => (
            <TaskLine key={`d-${task.title}-${index}`} task={task} />
          ))}
        </>
      ) : null}

      {undone.length > 0 ? (
        <>
          <AppText variant="caption" color="textTertiary" style={styles.group}>
            {`시작하지 못한 일 ${undone.length}`}
          </AppText>
          {undone.map((task, index) => (
            <TaskLine key={`u-${task.title}-${index}`} task={task} />
          ))}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { marginTop: 16 },
  summary: { marginTop: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  summaryRight: { alignItems: 'flex-end' },
  bigNumber: { marginTop: 2 },
  time: { marginTop: 4, marginBottom: 6 },
  track: { height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  group: { marginTop: 22, marginBottom: 2 },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  undone: { textDecorationLine: 'line-through' },
});
