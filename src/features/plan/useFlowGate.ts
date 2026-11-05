import { useEvolution } from '@/features/history/useEvolution';
import { useHistoryStore } from '@/features/history/historyStore';
import { usePlanStore } from '@/features/schedule/planStore';
import { useHydrated } from '@/lib/useHydrated';

// 계획 만들기 3단계 화면이 공통으로 확인하는 것: 저장된 값을 다 읽었는지, 이번 달이 끝났는지(5번째 실패 = 새 계획 불가).
export const useFlowGate = () => {
  const planHydrated = useHydrated(usePlanStore);
  const historyHydrated = useHydrated(useHistoryStore);
  const { ended } = useEvolution();
  return { ready: planHydrated && historyHydrated, ended };
};
