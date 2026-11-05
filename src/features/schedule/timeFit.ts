import type { Task } from '@/features/tasks/types';

import { AUTO_MIN_BREAK, buildSchedule, type BreakPolicy } from './buildSchedule';

// 할 일이 이만큼(개) 이상이면 "많이 잡았어요" 안내를 보인다(Estimate).
export const MANY_TASKS = 5;
// 할 일 + 최소 쉬는 시간이 쓸 수 있는 시간의 이만큼(비율) 이상이면 "거의 다 채웠어요" 안내를 보인다(Estimate).
export const TIGHT_RATIO = 0.9;

export type Overload = { kind: 'many'; count: number } | { kind: 'tight'; percent: number };

// 시간 안에는 다 들어가지만 욕심이 큰 계획인지(사용자 요청 아님, 추천 반영: 나태한 사람은 의욕 넘치는 날 계획을 부풀린다).
// 시간이 모자란 경우는 TimeFitNotice가 맡으므로 여기서는 알리지 않는다. 규칙(실패 판정)은 바꾸지 않는 안내일 뿐이다.
export const overloadOf = (taskCount: number, needed: number, available: number): Overload | null => {
  if (taskCount === 0 || available <= 0 || needed > available) return null;
  if (taskCount >= MANY_TASKS) return { kind: 'many', count: taskCount };
  const ratio = needed / available;
  return ratio >= TIGHT_RATIO ? { kind: 'tight', percent: Math.round(ratio * 100) } : null;
};

// 할 일이 쓸 수 있는 시간에 들어가는지(2·3단계 화면의 미리 알림용)
export const timeFitOf = (tasks: readonly Task[], startMin: number, endMin: number, breaks: BreakPolicy) => {
  const minBreak = breaks.kind === 'fixed' ? breaks.minutes : AUTO_MIN_BREAK;
  const needed = tasks.reduce((total, task) => total + task.minutes, 0) + Math.max(0, tasks.length - 1) * minBreak;
  const result = buildSchedule({ tasks, startMin, endMin, breaks });
  return {
    available: endMin - startMin,
    needed,
    fitCount: result.items.filter((item) => item.kind === 'task').length,
    excludedTitles: result.excluded.map((task) => task.title),
  };
};
