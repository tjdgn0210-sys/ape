import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Task } from './types';

// [계획 다시 짜기]를 누를 때 지우는 할 일 목록을 잠깐 보관한다(사용자 요청: 다시 짜면 깨끗하게 시작하되,
// "이전 계획 불러오기"로 되살릴 수 있게). 새 계획을 시작하면 비운다.
type PreviousPlanState = {
  tasks: Task[] | null;
  keep: (tasks: readonly Task[]) => void;
  clear: () => void;
};

export const usePreviousPlanStore = create<PreviousPlanState>()(
  persist(
    (set) => ({
      tasks: null,
      keep: (tasks) => set({ tasks: tasks.length > 0 ? [...tasks] : null }),
      clear: () => set({ tasks: null }),
    }),
    {
      name: 'yuinwon.previousPlan',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
);
