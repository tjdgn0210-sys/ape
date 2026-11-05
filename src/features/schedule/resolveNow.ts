import { START_GRACE_SEC, type PlanItem, type PlanTaskItem } from './types';

// 지금 할 일 카드의 상태(사용자 요청: 시작만 돕는 앱).
// - pending: 시작 시각이 됐고 아직 [시작]을 안 눌렀다. 시작 시각부터 5분 안에 눌러야 한다(마감 = deadlineSec).
// - running: [시작]을 눌렀다(성공). 일정 끝 시각까지 진행 중으로 보여 준다.
// - missed: 5분 안에 못 눌렀다(실패).
// - late: 5분이 지난 뒤 [늦었어도 시작]을 눌렀다(실패는 그대로, 늦게라도 시작한 기록만).
export type TaskStatus = 'pending' | 'running' | 'missed' | 'late';

// 지금 계획표 카드에 무엇을 보여 줄지 정한다. 모든 시각은 "하루 중 초"다.
export type NowState =
  // 지금 일정이 할 일
  | { kind: 'task'; item: PlanTaskItem; status: TaskStatus; startSec: number; endSec: number; deadlineSec: number }
  // 지금은 휴식 시간
  | { kind: 'break'; item: PlanItem; startSec: number; endSec: number }
  // 첫 일정(또는 다음 일정) 시작 전
  | { kind: 'before'; item: PlanItem; startSec: number; endSec: number }
  // 마지막 일정이 끝남
  | { kind: 'finished'; done: number; total: number };

const secOf = (minutes: number) => minutes * 60;

// 시작을 눌러야 하는 마감 시각(초). 일정이 5분보다 짧으면 일정 끝까지.
export const deadlineOf = (item: PlanItem) => Math.min(secOf(item.startMin) + START_GRACE_SEC, secOf(item.endMin));

export const resolveNow = (
  items: readonly PlanItem[],
  started: ReadonlySet<string>,
  nowSec: number,
  lateStarted: ReadonlySet<string> = new Set(),
): NowState => {
  const taskCount = items.filter((item) => item.kind === 'task').length;
  const doneCount = items.filter((item) => item.kind === 'task' && started.has(item.taskId)).length;

  const covering = items.find((item) => secOf(item.startMin) <= nowSec && nowSec < secOf(item.endMin));
  if (covering) {
    const span = { startSec: secOf(covering.startMin), endSec: secOf(covering.endMin) };
    if (covering.kind === 'break') return { kind: 'break', item: covering, ...span };
    const deadlineSec = deadlineOf(covering);
    const status: TaskStatus = started.has(covering.taskId)
      ? 'running'
      : nowSec < deadlineSec
        ? 'pending'
        : lateStarted.has(covering.taskId)
          ? 'late'
          : 'missed';
    return { kind: 'task', item: covering, status, deadlineSec, ...span };
  }

  const next = items.find((item) => secOf(item.startMin) > nowSec);
  if (next) return { kind: 'before', item: next, startSec: nowSec, endSec: secOf(next.startMin) };

  return { kind: 'finished', done: doneCount, total: taskCount };
};

// 카드가 가리키는 일정은 목록에서 제외하고, 아직 시작하지 않은 일정만 "다음 일정"으로 보여 준다.
export const upcomingItems = (items: readonly PlanItem[], state: NowState, nowSec: number): PlanItem[] =>
  items.filter((item) => {
    if (secOf(item.startMin) <= nowSec) return false;
    return !(state.kind === 'before' && item === state.item);
  });

// 시작을 못 한 할 일(5분이 지났는데 안 누름). 카드에 보이는 일정은 카드에 있으므로 목록에서 뺀다.
export const missedTasks = (items: readonly PlanItem[], started: ReadonlySet<string>, nowSec: number): PlanTaskItem[] =>
  items.flatMap((item) => (item.kind === 'task' && !started.has(item.taskId) && nowSec >= deadlineOf(item) ? [item] : []));
