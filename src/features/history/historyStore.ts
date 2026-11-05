import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Plan } from '@/features/schedule/types';

import { settlePlan } from './evolution';
import type { DevolutionNotice, RecoveryNotice, Records } from './types';

type HistoryState = {
  records: Records;
  notice: DevolutionNotice | null;
  // 연속 성공으로 실패 1회가 지워졌을 때 한 번 보여 주는 안내
  recovery: RecoveryNotice | null;
  // 실패한 날 중 달력에서 "쾅" 효과를 아직 안 보여 준 날(한 번 보이면 지운다)
  slamKey: string | null;
  // 앱을 처음 쓴 날. 이 날 이후 기록 없이 지나간 날을 달력에서 "계획 없음"으로 보여 줄 때 기준이 된다.
  startedKey: string | null;
  markStarted: (todayKey: string) => void;
  // 지난 날의 계획표를 기록으로 확정한다.
  settle: (plan: Plan, todayKey: string) => void;
  dismissNotice: () => void;
  dismissRecovery: () => void;
  clearSlam: () => void;
};

type PersistedHistoryState = Pick<HistoryState, 'records' | 'notice' | 'recovery' | 'slamKey' | 'startedKey'>;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: {},
      notice: null,
      recovery: null,
      slamKey: null,
      startedKey: null,
      markStarted: (todayKey) => set((state) => (state.startedKey === null ? { startedKey: todayKey } : state)),
      settle: (plan, todayKey) =>
        set((state) => {
          const result = settlePlan(state.records, plan, todayKey);
          if (result.records === state.records) return state;
          // 안내를 아직 안 본 상태에서 또 실패하면 가장 최근 것으로 바꾼다.
          return {
            records: result.records,
            notice: result.notice ?? state.notice,
            recovery: result.recovery ?? state.recovery,
            slamKey: result.notice?.dateKey ?? state.slamKey,
          };
        }),
      dismissNotice: () => set({ notice: null }),
      dismissRecovery: () => set({ recovery: null }),
      clearSlam: () => set({ slamKey: null }),
    }),
    {
      name: 'yuinwon.history',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedHistoryState => ({
        records: state.records,
        notice: state.notice,
        recovery: state.recovery,
        slamKey: state.slamKey,
        startedKey: state.startedKey,
      }),
    },
  ),
);
