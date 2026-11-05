import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TaskDraft } from '@/features/tasks/types';

import { recordFrequent, type FrequentTask } from './frequent';

type FrequentState = {
  items: FrequentTask[];
  record: (draft: TaskDraft) => void;
  forget: (title: string) => void;
  // 모두 지운다(설정의 [자주 한 일 초기화])
  clear: () => void;
};

export const useFrequentStore = create<FrequentState>()(
  persist(
    (set) => ({
      items: [],
      record: (draft) => set((state) => ({ items: recordFrequent(state.items, draft, Date.now()) })),
      clear: () => set({ items: [] }),
      forget: (title) => set((state) => ({ items: state.items.filter((item) => item.title !== title) })),
    }),
    {
      name: 'yuinwon.frequent',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
