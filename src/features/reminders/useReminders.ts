import { useEffect } from 'react';

import { monthKeyOf } from '@/features/history/evolution';
import { useEvolution } from '@/features/history/useEvolution';
import { usePlanStore } from '@/features/schedule/planStore';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { dateKeyOf } from '@/lib/time';
import { useHydrated } from '@/lib/useHydrated';

import { syncReminders } from './syncReminders';

// 계획표·알림 설정·종료 상태가 바뀔 때마다(만들기, 완료 체크, 비우기 …) 알림 예약을 다시 맞춘다.
export const useReminders = () => {
  const planReady = useHydrated(usePlanStore);
  const settingsReady = useHydrated(useSettingsStore);
  const plan = usePlanStore((state) => state.plan);
  const enabled = useSettingsStore((state) => state.morningEnabled);
  const minute = useSettingsStore((state) => state.morningMinute);
  const eveningEnabled = useSettingsStore((state) => state.eveningEnabled);
  const eveningMinute = useSettingsStore((state) => state.eveningMinute);
  const { ended } = useEvolution();
  const endedMonthKey = ended ? monthKeyOf(dateKeyOf(new Date())) : null;

  useEffect(() => {
    if (!planReady || !settingsReady) return;
    void syncReminders(plan, { enabled, minute, endedMonthKey, eveningEnabled, eveningMinute });
  }, [planReady, settingsReady, plan, enabled, minute, endedMonthKey, eveningEnabled, eveningMinute]);
};
