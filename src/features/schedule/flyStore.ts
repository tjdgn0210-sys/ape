import { create } from 'zustand';

// 시작 효과로 날아가는 유인원 한 마리(화면 전체 위에 그린다).
// kick: 사람이 왼쪽에서 걷어차서 날아간다(오른쪽 위로 향한다).
export type Fly = { id: number; x: number; y: number; width: number; power: number; kick?: boolean };

type FlyState = {
  flies: Fly[];
  launch: (fly: Omit<Fly, 'id'>) => void;
  land: (id: number) => void;
};

let nextId = 1;

export const useFlyStore = create<FlyState>()((set) => ({
  flies: [],
  launch: (fly) => set((state) => ({ flies: [...state.flies, { ...fly, id: nextId++ }] })),
  land: (id) => set((state) => ({ flies: state.flies.filter((fly) => fly.id !== id) })),
}));
