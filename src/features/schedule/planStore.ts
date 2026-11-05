import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cutAndPullForward } from './retime';
import { START_GRACE_SEC, type Plan } from './types';

type PlanState = {
  plan: Plan | null;
  setPlan: (plan: Plan) => void;
  clearPlan: () => void;
  // [시작] 버튼(사용자 요청: 시작만 돕는 앱): 일정 시작 시각부터 5분 안에 누르면 성공으로 기록한다.
  // 5분이 지났거나 이미 기록된 할 일이면 아무것도 하지 않는다.
  start: (taskId: string, atSec: number) => void;
  // 시작 시각 전에 미리 시작한다(첫 일정이 아직 안 됐을 때 [지금 시작]): 일정 전체를 지금으로 당기고 그 할 일을 시작한 것으로 기록한다.
  startNow: (atSec: number) => void;
  // 5분이 지난 뒤 [늦었어도 시작]: 성공은 아니고(실패 그대로) 늦게라도 시작했다는 기록만 남긴다.
  lateStart: (taskId: string, atSec: number) => void;
  // 지금 휴식을 건너뛴다: 휴식을 지금에서 끊고 뒤 일정을 앞당긴다. 다음 할 일은 지금부터 5분 안에 [시작]을 눌러야 성공이다(자동으로 시작 처리하지 않는다).
  skipBreak: (atSec: number) => void;
};

type PersistedPlanState = Pick<PlanState, 'plan'>;

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: null,
      setPlan: (plan) => set({ plan }),
      clearPlan: () => set({ plan: null }),
      start: (taskId, atSec) =>
        set((state) => {
          if (state.plan === null || state.plan.completedTaskIds.includes(taskId)) return state;
          const item = state.plan.items.find((candidate) => candidate.kind === 'task' && candidate.taskId === taskId);
          if (item === undefined || atSec >= item.startMin * 60 + START_GRACE_SEC) return state;
          return {
            plan: {
              ...state.plan,
              completedTaskIds: [...state.plan.completedTaskIds, taskId],
              startedAt: { ...(state.plan.startedAt ?? {}), [taskId]: atSec },
            },
          };
        }),
      startNow: (atSec) =>
        set((state) => {
          if (state.plan === null) return state;
          const nowMin = Math.floor(atSec / 60);
          const index = state.plan.items.findIndex((item) => item.startMin * 60 > atSec);
          const next = state.plan.items[index];
          if (next === undefined || next.kind !== 'task' || state.plan.completedTaskIds.includes(next.taskId)) return state;
          const shift = next.startMin - nowMin;
          if (shift <= 0) return state;
          // 지금 일정과 그 뒤 모든 일정을 같은 만큼 앞당긴다(길이는 그대로).
          const items = state.plan.items.map((item, i) =>
            i < index ? item : { ...item, startMin: item.startMin - shift, endMin: item.endMin - shift },
          );
          return {
            plan: {
              ...state.plan,
              items,
              completedTaskIds: [...state.plan.completedTaskIds, next.taskId],
              startedAt: { ...(state.plan.startedAt ?? {}), [next.taskId]: atSec },
            },
          };
        }),
      lateStart: (taskId, atSec) =>
        set((state) => {
          if (state.plan === null || state.plan.completedTaskIds.includes(taskId)) return state;
          const item = state.plan.items.find((candidate) => candidate.kind === 'task' && candidate.taskId === taskId);
          // 마감 전에는 [시작](성공)을 눌러야 하고, 일정이 끝난 뒤에는 의미가 없다.
          if (item === undefined || atSec < item.startMin * 60 + START_GRACE_SEC || atSec >= item.endMin * 60) return state;
          if (state.plan.lateStartedAt?.[taskId] !== undefined) return state;
          return { plan: { ...state.plan, lateStartedAt: { ...(state.plan.lateStartedAt ?? {}), [taskId]: atSec } } };
        }),
      skipBreak: (atSec) =>
        set((state) => {
          if (state.plan === null) return state;
          const index = state.plan.items.findIndex(
            (item) => item.kind === 'break' && item.startMin * 60 <= atSec && atSec < item.endMin * 60,
          );
          if (index < 0) return state;
          const items = cutAndPullForward(state.plan.items, index, Math.floor(atSec / 60));
          // 휴식을 끊으면 뒤 일정이 앞당겨져 다음 할 일의 시작 시각이 지금이 된다. 자동으로 시작한 것으로 치지 않고,
          // 다른 일정과 똑같이 그 시각부터 5분 안에 [시작]을 눌러야 성공이다(사용자 요청).
          return { plan: { ...state.plan, items } };
        }),
    }),
    {
      name: 'yuinwon.plan',
      // 1: Plan에 completedTaskIds 추가(3단계에서 저장된 계획에는 없다)
      version: 1,
      migrate: (persisted): PersistedPlanState => {
        const saved = persisted as { plan?: Partial<Plan> | null } | null;
        const plan = saved?.plan;
        if (!plan || !plan.dateKey || !plan.items) return { plan: null };
        return {
          plan: {
            dateKey: plan.dateKey,
            items: plan.items,
            excludedTitles: plan.excludedTitles ?? [],
            completedTaskIds: plan.completedTaskIds ?? [],
          },
        };
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedPlanState => ({ plan: state.plan }),
    },
  ),
);
