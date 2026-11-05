import { deadlineOf } from '@/features/schedule/resolveNow';
import type { Plan } from '@/features/schedule/types';
import { previousDayKey } from '@/lib/time';

import { RECOVERY_STREAK, failuresIn, isEnded, lastRecoveredOn, monthKeyOf } from './evolution';
import type { Records } from './types';

// 오늘 계획이 지금 어떤 상태인가(연속 성공 계산용).
// - done: 오늘 할 일을 전부 제때 시작했다(자정에 성공으로 확정된다).
// - failed: 시작 마감을 놓친 일이 있다(자정에 실패로 확정된다).
// - open: 아직 어느 쪽도 아니다(계획이 없는 경우도 포함).
export type TodayState = 'done' | 'failed' | 'open';

export const todayStateOf = (plan: Plan | null, records: Records, todayKey: string, nowSec: number): TodayState => {
  const settled = records[todayKey];
  if (settled !== undefined) return settled.result === 'success' ? 'done' : 'failed';
  if (plan === null || plan.dateKey !== todayKey) return 'open';

  const started = new Set(plan.completedTaskIds);
  const tasks = plan.items.flatMap((item) => (item.kind === 'task' ? [item] : []));
  if (tasks.some((item) => !started.has(item.taskId) && nowSec >= deadlineOf(item))) return 'failed';
  return tasks.length > 0 && tasks.every((item) => started.has(item.taskId)) ? 'done' : 'open';
};

// 연속으로 모든 할 일을 제때 시작한 날 수(사용자 결정: 계획을 안 짠 날도 연속이 끊긴다).
// 어제부터 거꾸로 성공 기록이 이어지는 만큼 센다. 오늘은 성공하면 더하고, 실패가 정해졌으면 0, 아직이면 그대로 둔다.
export const streakOf = (records: Records, todayKey: string, today: TodayState): number => {
  if (today === 'failed') return 0;
  let count = today === 'done' ? 1 : 0;
  // 오늘 기록이 이미 있으면(위 today에 반영됨) 어제부터 센다.
  for (let key = previousDayKey(todayKey); records[key]?.result === 'success'; key = previousDayKey(key)) count += 1;
  return count;
};

// 이번 달 실패 1회를 지우기까지 남은 연속 일수(사용자 요청: 회복까지 남은 일수를 보여 주기).
// 지울 실패가 없거나 이번 달이 끝났으면 null. 0이면 오늘 자정에 회복된다. 오늘 실패가 정해졌으면 처음부터(3일).
// 센 방법은 회복 판정(recoverIfEarned)과 같다: 같은 달 안, 마지막 회복 날 다음부터, 오늘이 성공이면 오늘도 센다.
export const recoveryLeftOf = (records: Records, todayKey: string, today: TodayState): number | null => {
  const month = monthKeyOf(todayKey);
  const failures = failuresIn(records, month);
  if (failures === 0 || isEnded(failures)) return null;
  if (today === 'failed') return RECOVERY_STREAK;

  const since = lastRecoveredOn(records, month);
  let run = today === 'done' ? 1 : 0;
  for (
    let key = previousDayKey(todayKey);
    key > since && monthKeyOf(key) === month && records[key]?.result === 'success';
    key = previousDayKey(key)
  ) {
    run += 1;
  }
  return Math.max(0, RECOVERY_STREAK - run);
};

// 화면에 보이는 한 줄: "3일 연속 제때 시작 · 회복까지 1일". 둘 다 없으면 null(숨긴다).
export const streakLabelOf = (streak: number, recoveryLeft: number | null): string | null => {
  const parts = [
    ...(streak > 0 ? [`${streak}일 연속 제때 시작`] : []),
    ...(recoveryLeft === null ? [] : [recoveryLeft === 0 ? '오늘 자정에 실패 1회 회복' : `회복까지 ${recoveryLeft}일`]),
  ];
  return parts.length === 0 ? null : parts.join(' · ');
};
