import { useEffect } from 'react';

import { usePlanStore } from '@/features/schedule/planStore';
import { useNow } from '@/features/schedule/useNow';
import { useTaskStore } from '@/features/tasks/taskStore';
import { dateKeyOf } from '@/lib/time';
import { useHydrated } from '@/lib/useHydrated';

import { useHistoryStore } from './historyStore';

// 날짜가 바뀐 뒤(자정이 지난 뒤) 남아 있는 지난 계획표를 기록으로 확정하고 비운다.
// 그날 완료한 할 일은 목록에서 지우고, 못 끝낸 할 일은 목록에 남긴다.
// 앱이 꺼져 있었더라도 다음에 켜질 때 한 번에 처리된다.
export const useSettlement = () => {
  const planReady = useHydrated(usePlanStore);
  const historyReady = useHydrated(useHistoryStore);
  const tasksReady = useHydrated(useTaskStore);
  const now = useNow(30_000);
  const todayKey = dateKeyOf(now);

  useEffect(() => {
    if (!planReady || !historyReady || !tasksReady) return;
    // 처음 쓴 날을 한 번 기억해 둔다(달력의 "계획 없음" 표시 기준).
    useHistoryStore.getState().markStarted(todayKey);
    const { plan, clearPlan } = usePlanStore.getState();
    if (plan === null || plan.dateKey >= todayKey) return;
    useHistoryStore.getState().settle(plan, todayKey);
    useTaskStore.getState().removeMany(plan.completedTaskIds);
    clearPlan();
  }, [planReady, historyReady, tasksReady, todayKey]);
};
