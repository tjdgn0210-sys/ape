import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '@/lib/id';

import type { Task, TaskDraft } from './types';

type TaskState = {
  tasks: Task[];
  addTask: (draft: TaskDraft, routineId?: string) => void;
  // routineId: 생략 = 그대로, null = 반복에서 떼기
  updateTask: (id: string, draft: TaskDraft, routineId?: string | null) => void;
  removeTask: (id: string) => void;
  removeMany: (ids: readonly string[]) => void;
  addMany: (items: readonly Omit<Task, 'id'>[]) => void;
  // 목록 전체를 바꾼다(계획 다시 짜기로 비우기, 이전 계획 불러오기)
  replaceAll: (tasks: readonly Task[]) => void;
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (draft, routineId) =>
        set((state) => ({ tasks: [...state.tasks, { id: createId(), ...draft, ...(routineId ? { routineId } : {}) }] })),
      updateTask: (id, draft, routineId) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            const nextRoutineId = routineId === undefined ? task.routineId : (routineId ?? undefined);
            return { id, ...draft, ...(nextRoutineId ? { routineId: nextRoutineId } : {}) };
          }),
        })),
      removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
      removeMany: (ids) => set((state) => ({ tasks: state.tasks.filter((task) => !ids.includes(task.id)) })),
      addMany: (items) => set((state) => ({ tasks: [...state.tasks, ...items.map((item) => ({ id: createId(), ...item }))] })),
      replaceAll: (tasks) => set({ tasks: [...tasks] }),
    }),
    {
      name: 'yuinwon.tasks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
);
