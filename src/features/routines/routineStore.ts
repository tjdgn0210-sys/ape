import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TaskDraft } from '@/features/tasks/types';
import { createId } from '@/lib/id';

import type { Routine } from './types';

type RoutineState = {
  routines: Routine[];
  // 반복 할 일을 목록에 마지막으로 넣은 날짜. 같은 날 두 번 넣지 않는다.
  lastAddedOn: string | null;
  addRoutine: (draft: TaskDraft, days: number[]) => string;
  updateRoutine: (id: string, draft: TaskDraft, days: number[]) => void;
  removeRoutine: (id: string) => void;
  markAdded: (dateKey: string) => void;
};

type PersistedRoutineState = Pick<RoutineState, 'routines' | 'lastAddedOn'>;

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set) => ({
      routines: [],
      lastAddedOn: null,
      addRoutine: (draft, days) => {
        const id = createId();
        set((state) => ({ routines: [...state.routines, { id, ...draft, days }] }));
        return id;
      },
      updateRoutine: (id, draft, days) =>
        set((state) => ({
          routines: state.routines.map((routine) => (routine.id === id ? { id, ...draft, days } : routine)),
        })),
      removeRoutine: (id) => set((state) => ({ routines: state.routines.filter((routine) => routine.id !== id) })),
      markAdded: (dateKey) => set({ lastAddedOn: dateKey }),
    }),
    {
      name: 'yuinwon.routines',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedRoutineState => ({ routines: state.routines, lastAddedOn: state.lastAddedOn }),
    },
  ),
);
