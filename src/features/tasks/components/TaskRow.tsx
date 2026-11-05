import { Pressable, StyleSheet } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { formatDuration } from '@/lib/time';

import { IMPORTANCE_LABEL, type Task } from '../types';

type TaskRowProps = {
  task: Task;
  onPress: (task: Task) => void;
  onLongPress: (task: Task) => void;
};

// 할 일 이름(크고 진하게)과 걸리는 시간(작고 회색)만. 목록은 중요도 높은 순이라 위에 있을수록 중요하다.
export const TaskRow = ({ task, onPress, onLongPress }: TaskRowProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${task.title}${task.routineId ? ', 반복' : ''}, 중요도 ${IMPORTANCE_LABEL[task.importance]}, ${task.minutes}분`}
    accessibilityHint="누르면 수정, 길게 누르면 삭제"
    onPress={() => onPress(task)}
    onLongPress={() => onLongPress(task)}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
  >
    <AppText variant="title" numberOfLines={1} style={styles.title}>
      {task.title}
    </AppText>
    {task.routineId ? <Icon name="repeat" size={15} color="textMuted" /> : null}
    <AppText variant="body" color="textTertiary">
      {formatDuration(task.minutes)}
    </AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  row: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.5 },
  title: { flex: 1 },
});
