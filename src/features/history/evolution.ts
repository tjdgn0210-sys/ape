import type { Plan } from '@/features/schedule/types';
import { previousDayKey } from '@/lib/time';

import { dateKeyFor } from './calendar';
import type { DayRecord, DayTask, DevolutionNotice, RecoveryNotice, Records } from './types';

// 한 달에 이만큼 실패하면 끝난다.
export const MAX_FAILURES = 5;
// 단계는 0(현대인)~4(유인원). 실패 N회 = 단계 N.
export const LAST_STAGE = 4;

export const monthKeyOf = (dateKey: string) => dateKey.slice(0, 7);

// 회복(연속 성공으로 지워진) 실패는 세지 않는다.
export const failuresIn = (records: Records, monthKey: string) =>
  Object.values(records).filter(
    (record) => record.result === 'fail' && record.forgivenOn === undefined && monthKeyOf(record.dateKey) === monthKey,
  ).length;

// 한 달을 한 번도 빠짐없이 지켰는지(이스터에그 "알파메일", 사용자 요청): 지난 달(이번 달 이전)이고 그 달의 모든 날이 성공 기록이다.
// 계획을 안 짠 날·실패한 날(회복된 실패 포함)이 하루라도 있으면 아니다. 이번 달은 아직 끝나지 않아서 안 된다.
export const isPerfectMonth = (records: Records, monthKey: string, todayKey: string) => {
  if (monthKey >= monthKeyOf(todayKey)) return false;
  const [year = 0, month = 1] = monthKey.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    if (records[dateKeyFor(year, month, day)]?.result !== 'success') return false;
  }
  return true;
};

// 이번 달에 이만큼(일) 연속으로 제때 시작하면 이번 달 실패 1회가 지워진다(사용자 결정: 3일).
export const RECOVERY_STREAK = 3;

export const stageIndexFor = (failures: number) => Math.min(Math.max(failures, 0), LAST_STAGE);

export const isEnded = (failures: number) => failures >= MAX_FAILURES;

export const tasksOfPlan = (plan: Plan): DayTask[] =>
  plan.items.flatMap((item) =>
    item.kind === 'task'
      ? [
          {
            title: item.title,
            minutes: item.endMin - item.startMin,
            done: plan.completedTaskIds.includes(item.taskId),
            ...(plan.lateStartedAt?.[item.taskId] !== undefined ? { late: true } : {}),
          },
        ]
      : [],
  );

export const isAllDone = (tasks: readonly DayTask[]) => tasks.length > 0 && tasks.every((task) => task.done);

// 그 달에 마지막으로 회복이 일어난 날(없으면 ''). 연속 성공은 이 날 다음부터 센다.
export const lastRecoveredOn = (records: Records, monthKey: string) =>
  Object.values(records).reduce(
    (latest, record) =>
      record.result === 'fail' && monthKeyOf(record.dateKey) === monthKey && record.forgivenOn !== undefined && record.forgivenOn > latest
        ? record.forgivenOn
        : latest,
    '',
  );

export type Settlement = { records: Records; notice: DevolutionNotice | null; recovery: RecoveryNotice | null };

// 성공으로 확정된 날(successKey) 기준으로 같은 달 연속 성공이 RECOVERY_STREAK일을 채웠으면 그 달의 가장 최근 실패 1회를 지운다.
// - 연속은 같은 달 안에서, 마지막 회복 날 다음부터 센다(한 번 쓴 성공일은 다시 쓰지 않는다. 또 지우려면 새로 3일).
// - 지울 실패가 없으면 아무 일도 없다.
export const recoverIfEarned = (records: Records, successKey: string): { records: Records; recovery: RecoveryNotice | null } => {
  const month = monthKeyOf(successKey);
  const monthFails = Object.values(records).filter((record) => record.result === 'fail' && monthKeyOf(record.dateKey) === month);
  const open = monthFails.filter((record) => record.forgivenOn === undefined).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const target = open[open.length - 1];
  if (target === undefined) return { records, recovery: null };

  const since = lastRecoveredOn(records, month);
  let run = 0;
  for (
    let key = successKey;
    key > since &&monthKeyOf(key) === month && records[key]?.result === 'success';
    key = previousDayKey(key)
  ) {
    run += 1;
  }
  if (run < RECOVERY_STREAK) return { records, recovery: null };

  const before = failuresIn(records, month);
  const recovered = { ...records, [target.dateKey]: { ...target, forgivenOn: successKey } };
  return {
    records: recovered,
    recovery: {
      dateKey: successKey,
      forgivenKey: target.dateKey,
      fromStage: stageIndexFor(before),
      toStage: stageIndexFor(before - 1),
    },
  };
};

// 지난 날의 계획표를 확정한다. 이미 기록된 날이거나 할 일이 없으면 아무것도 바꾸지 않는다.
export const settlePlan = (records: Records, plan: Plan, todayKey: string): Settlement => {
  const tasks = tasksOfPlan(plan);
  if (records[plan.dateKey] !== undefined || tasks.length === 0) return { records, notice: null, recovery: null };

  if (isAllDone(tasks)) {
    const record: DayRecord = { dateKey: plan.dateKey, result: 'success', failNo: null, tasks };
    const recovered = recoverIfEarned({ ...records, [plan.dateKey]: record }, plan.dateKey);
    return { records: recovered.records, notice: null, recovery: recovered.recovery };
  }

  const before = failuresIn(records, monthKeyOf(plan.dateKey));
  const failNo = before + 1;
  const record: DayRecord = { dateKey: plan.dateKey, result: 'fail', failNo, tasks };
  return {
    records: { ...records, [plan.dateKey]: record },
    recovery: null,
    notice: {
      dateKey: plan.dateKey,
      failNo,
      fromStage: stageIndexFor(before),
      toStage: stageIndexFor(failNo),
      // 실패가 난 달이 아직 이번 달일 때만 "이번 달이 끝났다"고 알린다.
      ended: isEnded(failNo) && monthKeyOf(plan.dateKey) === monthKeyOf(todayKey),
    },
  };
};
