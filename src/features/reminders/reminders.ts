import { START_GRACE_SEC, type Plan } from '@/features/schedule/types';

// 할 일이 시작하기 이만큼(분) 전에 알려 준다.
export const REMINDER_LEAD_MIN = 5;
// 시작 마감이 이만큼(분) 남았을 때 한 번 더 재촉한다(Estimate).
export const WARN_BEFORE_DEADLINE_MIN = 2;

// 시작 시각 알림에 붙는 [시작] 버튼(알림 카테고리와 버튼 id). 누르면 앱이 열리면서 그 할 일을 시작한 것으로 기록한다.
export const START_CATEGORY_ID = 'start-task';
export const START_ACTION_ID = 'start';

export type Reminder = {
  id: string;
  taskId: string;
  // lead = 시작 5분 전 미리 알림, start = 시작 시각(이때부터 5분 안에 [시작]을 눌러야 한다),
  // warn = 시작 마감 2분 전 재촉, miss = 5분이 지나 시작을 놓친 순간(오늘은 실패로 기록된다는 안내)
  kind: 'lead' | 'start' | 'warn' | 'miss';
  fireAt: Date;
  startMin: number;
  title: string;
};

// 아직 시작하지 않은 할 일 중, 알림 시각이 지금보다 뒤인 것만 고른다. 할 일마다 시작 5분 전, 시작 시각, 시작을 놓친 시각(+5분)에 한 번씩 보낸다.
// 시작을 누르면 알림을 다시 맞추므로(useReminders) 그 할 일의 남은 알림(놓침 안내 포함)은 사라진다.
// 휴식에는 알림을 보내지 않는다. 시작 5분 안으로 만든 첫 할 일은 5분 전 알림이 이미 지나서 빠진다.
export const remindersFor = (plan: Plan, now: Date): Reminder[] => {
  const [year = 0, month = 1, day = 1] = plan.dateKey.split('-').map(Number);

  return plan.items.flatMap((item) => {
    if (item.kind !== 'task' || plan.completedTaskIds.includes(item.taskId)) return [];
    // Date의 분 인자는 범위를 넘어가도 알아서 계산된다(예: 00:03 - 5분 = 전날 23:58).
    const at = (minute: number) => new Date(year, month - 1, day, 0, minute);
    // 시작 마감(분). 일정이 5분보다 짧으면 일정 끝까지.
    const deadlineMin = Math.min(item.startMin + START_GRACE_SEC / 60, item.endMin);
    const times: { kind: Reminder['kind']; fireAt: Date }[] = [
      { kind: 'lead', fireAt: at(item.startMin - REMINDER_LEAD_MIN) },
      { kind: 'start', fireAt: at(item.startMin) },
      // 마감 2분 전 재촉. 시작 알림과 같은 분이거나 앞서면(마감이 너무 가까운 짧은 일정) 보내지 않는다.
      ...(deadlineMin - WARN_BEFORE_DEADLINE_MIN > item.startMin
        ? [{ kind: 'warn' as const, fireAt: at(deadlineMin - WARN_BEFORE_DEADLINE_MIN) }]
        : []),
      { kind: 'miss', fireAt: at(deadlineMin) },
    ];
    return times
      .filter(({ fireAt }) => fireAt.getTime() > now.getTime())
      .map(({ kind, fireAt }) => ({
        id: `${plan.dateKey}-${item.taskId}-${kind}`,
        taskId: item.taskId,
        kind,
        fireAt,
        startMin: item.startMin,
        title: item.title,
      }));
  });
};
