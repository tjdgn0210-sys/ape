import { dateKeyOf } from '@/lib/time';

// 저녁 알림 기본 시각(하루 중 분, 21:00 — Estimate). 설정에서 바꿀 수 있다(settingsStore.eveningMinute).
export const EVENING_MINUTE = 21 * 60;
// 앞으로 이만큼의 날 동안 미리 예약한다. 앱을 열 때마다 다시 채운다(아침 알림과 같다).
export const EVENING_DAYS_AHEAD = 7;

export type EveningReminder = { id: string; fireAt: Date };

type EveningInput = {
  // 알림 시각(하루 중 분)
  minute?: number;
  enabled: boolean;
  now: Date;
  // 오늘 계획이 이미 있으면 오늘 알림은 보내지 않는다.
  hasTodayPlan: boolean;
  // 이번 달이 끝난 상태면 이 달(YYYY-MM)의 알림은 보내지 않는다(새 계획을 못 만든다).
  endedMonthKey: string | null;
};

// 계획을 안 짠 날 저녁에 한 번 알려 준다(사용자 선택: 계획 없는 날 저녁 알림).
// 앞으로 며칠치를 미리 예약해 두고, 계획을 만들면 그날 것은 다시 맞출 때 빠진다(useReminders → syncReminders).
export const eveningRemindersFor = ({ enabled, minute = EVENING_MINUTE, now, hasTodayPlan, endedMonthKey }: EveningInput): EveningReminder[] => {
  if (!enabled) return [];
  const todayKey = dateKeyOf(now);

  return Array.from({ length: EVENING_DAYS_AHEAD }, (_, offset) => {
    const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, minute);
    return { id: `evening-${dateKeyOf(fireAt)}`, fireAt, dateKey: dateKeyOf(fireAt) };
  })
    .filter(({ fireAt, dateKey }) => {
      if (fireAt.getTime() <= now.getTime()) return false;
      if (dateKey === todayKey && hasTodayPlan) return false;
      return endedMonthKey === null || dateKey.slice(0, 7) !== endedMonthKey;
    })
    .map(({ id, fireAt }) => ({ id, fireAt }));
};
