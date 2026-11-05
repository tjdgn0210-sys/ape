import { create } from 'zustand';

type StartEffectState = {
  // 계획을 막 시작했을 때만 true. 계획표 카드가 유인원이 떨어지는 효과를 한 번 보여 주고 끈다.
  armed: boolean;
  arm: () => void;
  disarm: () => void;
};

export const useStartEffectStore = create<StartEffectState>()((set) => ({
  armed: false,
  arm: () => set({ armed: true }),
  disarm: () => set({ armed: false }),
}));
