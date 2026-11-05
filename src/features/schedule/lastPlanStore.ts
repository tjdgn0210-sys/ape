import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TaskDraft } from '@/features/tasks/types';

// 마지막으로 시작한 계획의 모양(쓴 시간 길이 + 할 일 목록). 1단계의 [지난 계획 그대로]가 이것으로 시간과 할 일을 채운다.
// 계획을 [시작하기]할 때마다 덮어쓴다. 반복 연결(routineId)은 저장하지 않는다(반복 할 일은 하루에 한 번 알아서 들어오므로 겹치지 않게).
type LastPlan = {
  // 쓸 수 있는 시간의 길이(분). 시작 시각은 그날의 지금으로 새로 정한다.
  spanMin: number;
  tasks: TaskDraft[];
};

type LastPlanState = {
  lastPlan: LastPlan | null;
  save: (plan: LastPlan) => void;
  clear: () => void;
};

export const useLastPlanStore = create<LastPlanState>()(
  persist(
    (set) => ({
      lastPlan: null,
      save: (plan) => set({ lastPlan: plan.tasks.length > 0 && plan.spanMin > 0 ? plan : null }),
      clear: () => set({ lastPlan: null }),
    }),
    {
      name: 'yuinwon.lastPlan',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lastPlan: state.lastPlan }),
    },
  ),
);
