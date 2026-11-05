import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { BreakPrefs } from './types';

type PrefsState = BreakPrefs & {
  setPrefs: (prefs: BreakPrefs) => void;
};

// 마지막에 쓴 쉬는 시간·일정 스타일. 바로 시작과 밀린 일 재배치가 이 값을 쓴다.
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      breakMode: 'auto',
      manualBreakMin: 15,
      style: 'balanced',
      setPrefs: ({ breakMode, manualBreakMin, style }) => set({ breakMode, manualBreakMin, style }),
    }),
    {
      name: 'yuinwon.schedulePrefs',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ breakMode, manualBreakMin, style }): BreakPrefs => ({ breakMode, manualBreakMin, style }),
    },
  ),
);
