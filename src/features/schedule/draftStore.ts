import { create } from 'zustand';

import { minuteOfDayOf } from '@/lib/time';

import { defaultTimeDraft } from './presets';
import type { TimeDraft } from './types';

type DraftState = TimeDraft & {
  setDraft: (draft: TimeDraft) => void;
};

// 계획을 만드는 동안만 쓰는 값이라 저장하지 않는다(앱을 다시 켜면 처음부터).
export const useDraftStore = create<DraftState>()((set) => ({
  ...defaultTimeDraft(minuteOfDayOf(new Date())),
  setDraft: ({ startMin, endMin }) => set({ startMin, endMin }),
}));
