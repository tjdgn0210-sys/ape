import { IMPORTANCE_ORDER, type Task } from '@/features/tasks/types';

import type { BreakPrefs, PlanItem, ScheduleStyle } from './types';

// 쉬는 시간을 정하는 방법
// - fixed: 사용자가 직접 정한 길이로 모든 할 일 사이에 똑같이 넣는다.
// - auto: 앞 할 일의 길이, 일정 스타일, 남는 시간에 맞춰 사이마다 다르게 정한다.
export type BreakPolicy = { kind: 'fixed'; minutes: number } | { kind: 'auto'; style: ScheduleStyle };

type BuildInput = {
  tasks: readonly Task[];
  startMin: number;
  endMin: number;
  breaks: BreakPolicy;
};

type BuildResult = {
  items: PlanItem[];
  excluded: Task[];
};

const rankOf = (task: Task) => IMPORTANCE_ORDER.indexOf(task.importance);

// 화면에서 고른 쉬는 시간 설정을 계산용 규칙으로 바꾼다.
export const breakPolicyOf = ({ breakMode, manualBreakMin, style }: BreakPrefs): BreakPolicy =>
  breakMode === 'auto' ? { kind: 'auto', style } : { kind: 'fixed', minutes: manualBreakMin };

// 중요도 높은 순, 같으면 입력한 순서.
export const orderByImportance = (tasks: readonly Task[]): Task[] =>
  tasks
    .map((task, order) => ({ task, order }))
    .sort((a, b) => rankOf(a.task) - rankOf(b.task) || a.order - b.order)
    .map(({ task }) => task);

const BREAK_STEP = 5;
// 자동일 때 가장 짧은 쉬는 시간. 시간이 모자라도 이 밑으로는 줄이지 않고, 대신 할 일을 뺀다.
export const AUTO_MIN_BREAK = 5;

// 일정 스타일 = 오늘 쓸 수 있는 시간 중 할 일을 하고 "남는 시간"을 얼마나 쉬는 시간으로 쓸지(사용자 요청).
// 집중: 남는 시간의 25%만 쉬고 일찍 끝낸다. 균형: 60%. 여유: 남는 시간을 다 써서 정한 종료 시각에 딱 끝난다.
// 비율은 Estimate. 남는 시간이 같아도 정한 시간(시작~종료)이 다르면 쉬는 시간이 달라진다.
export const STYLE_SHARE: Record<ScheduleStyle, number> = { focus: 0.25, balanced: 0.6, relaxed: 1 };

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

// 자동 쉬는 시간: 스타일만큼의 쉬는 시간 예산을 사이마다 나눈다.
// 앞 할 일이 길수록 더 길게(앞 할 일 길이에 비례), 5분 단위, 사이마다 최소 5분.
const fitBreaks = (included: readonly Task[], available: number, style: ScheduleStyle) => {
  const gaps = included.length - 1;
  if (gaps <= 0) return [];
  const free = available - sum(included.map((task) => task.minutes));
  const budget = Math.min(free, Math.max(gaps * AUTO_MIN_BREAK, Math.floor(free * STYLE_SHARE[style])));
  const weights = included.slice(0, -1).map((task) => task.minutes);
  const weightTotal = sum(weights);
  const raw = weights.map((weight) => (budget * weight) / weightTotal);
  const breaks = raw.map((value) => Math.max(AUTO_MIN_BREAK, Math.floor(value / BREAK_STEP) * BREAK_STEP));

  // 최소 5분 때문에 예산을 넘었으면 가장 긴 것부터 5분씩 줄인다.
  while (sum(breaks) > budget) {
    const longest = Math.max(...breaks);
    if (longest <= AUTO_MIN_BREAK) break;
    breaks[breaks.indexOf(longest)] = longest - BREAK_STEP;
  }
  // 남은 예산은 반올림에서 많이 잘린 곳부터 5분씩 더한다.
  const order = raw.map((value, index) => ({ index, cut: value - (breaks[index] ?? 0) })).sort((a, b) => b.cut - a.cut);
  for (let k = 0; budget - sum(breaks) >= BREAK_STEP; k = (k + 1) % order.length) {
    const target = order[k];
    if (target === undefined) break;
    breaks[target.index] = (breaks[target.index] ?? 0) + BREAK_STEP;
  }
  // 여유는 종료 시각에 딱 맞춰 끝나도록 5분이 안 되는 나머지도 가장 긴 쉬는 시간에 붙인다.
  if (STYLE_SHARE[style] >= 1) {
    const rest = budget - sum(breaks);
    if (rest > 0) {
      const longest = Math.max(...breaks);
      breaks[breaks.indexOf(longest)] = longest + rest;
    }
  }
  return breaks;
};

// 규칙
// 1. 중요도 높은 순으로 배치한다(같으면 입력한 순서).
// 2. 할 일 사이에만 휴식을 넣는다. 첫 할 일 앞, 마지막 할 일 뒤에는 넣지 않는다.
// 3. 쓸 수 있는 시간보다 길면 중요도가 낮은 일부터(같으면 나중에 입력한 일부터) 하나씩 빼서 들어가게 한다(사용자 요청).
//    다 들어간 뒤 남는 시간에 들어가는 뺀 일(짧은 일)은 중요도 높은 순으로 다시 넣는다. 사이 쉬는 시간은 가장 짧은 값으로 계산.
// 4. 쉬는 시간이 "자동"이면 남는 시간 중 스타일 비율만큼을 쉬는 시간으로 쓰고, 앞 할 일 길이에 비례해 나눈다.
export const buildSchedule = ({ tasks, startMin, endMin, breaks }: BuildInput): BuildResult => {
  const sorted = orderByImportance(tasks);

  const available = endMin - startMin;
  const minBreak = breaks.kind === 'fixed' ? breaks.minutes : AUTO_MIN_BREAK;

  const need = (list: readonly Task[]) => sum(list.map((task) => task.minutes)) + Math.max(0, list.length - 1) * minBreak;

  const kept = [...sorted];
  const dropped: Task[] = [];
  while (kept.length > 0 && need(kept) > available) {
    const lowest = kept.pop();
    if (lowest !== undefined) dropped.unshift(lowest);
  }
  // 뺀 일 중 남는 시간에 아직 들어가는 것이 있으면 다시 넣는다(중요도 높은 순).
  const excluded: Task[] = [];
  for (const task of dropped) {
    const candidate = sorted.filter((item) => item === task || kept.includes(item));
    if (need(candidate) <= available) kept.splice(0, kept.length, ...candidate);
    else excluded.push(task);
  }
  const included = kept;

  const gaps =
    breaks.kind === 'fixed'
      ? included.slice(0, -1).map(() => breaks.minutes)
      : fitBreaks(included, available, breaks.style);

  const items: PlanItem[] = [];
  let cursor = startMin;
  included.forEach((task, index) => {
    const gap = index > 0 ? (gaps[index - 1] ?? 0) : 0;
    const taskStart = cursor + gap;
    if (gap > 0) items.push({ kind: 'break', startMin: cursor, endMin: taskStart });
    items.push({
      kind: 'task',
      taskId: task.id,
      title: task.title,
      importance: task.importance,
      startMin: taskStart,
      endMin: taskStart + task.minutes,
    });
    cursor = taskStart + task.minutes;
  });

  return { items, excluded };
};
