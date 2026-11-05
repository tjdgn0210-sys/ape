import type { Routine } from '@/features/routines/types';

import type { Task } from './types';

// 오늘 요일에 해당하는 반복 할 일 중, 목록에 아직 없는 것만 새 할 일로 만든다.
// (어제 못 끝내서 남아 있는 같은 반복 할 일이 있으면 또 넣지 않는다.)
export const dueRoutineTasks = (
  routines: readonly Routine[],
  tasks: readonly Task[],
  weekday: number,
): Omit<Task, 'id'>[] =>
  routines
    .filter((routine) => routine.days.includes(weekday) && !tasks.some((task) => task.routineId === routine.id))
    .map(({ id, title, importance, minutes }) => ({ title, importance, minutes, routineId: id }));
