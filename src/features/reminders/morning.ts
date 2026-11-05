import { dateKeyOf } from '@/lib/time';

// 앞으로 이만큼의 날 동안 아침 알림을 미리 예약한다. 앱을 열 때마다 다시 채운다.
export const MORNING_DAYS_AHEAD = 7;

export type MorningReminder = { id: string; fireAt: Date };

type MorningInput = {
  enabled: boolean;
  // 하루 중 분(540 = 09:00)
  minute: number;
  now: Date;
  // 오늘 계획이 이미 있으면 오늘 알림은 보내지 않는다.
  hasTodayPlan: boolean;
  // 이번 달이 끝난 상태면 이 달(YYYY-MM)의 알림은 보내지 않는다(1일까지 새 계획을 못 만든다).
  endedMonthKey: string | null;
};

export const morningRemindersFor = ({ enabled, minute, now, hasTodayPlan, endedMonthKey }: MorningInput): MorningReminder[] => {
  if (!enabled) return [];
  const todayKey = dateKeyOf(now);

  return Array.from({ length: MORNING_DAYS_AHEAD }, (_, offset) => {
    // 분 인자는 범위를 넘어가도 알아서 계산된다.
    const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, minute);
    return { id: `morning-${dateKeyOf(fireAt)}`, fireAt, dateKey: dateKeyOf(fireAt) };
  })
    .filter(({ fireAt, dateKey }) => {
      if (fireAt.getTime() <= now.getTime()) return false;
      if (dateKey === todayKey && hasTodayPlan) return false;
      return endedMonthKey === null || dateKey.slice(0, 7) !== endedMonthKey;
    })
    .map(({ id, fireAt }) => ({ id, fireAt }));
};
