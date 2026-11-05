import { create } from 'zustand';

// Alert.alert와 같은 모양으로 쓰는 앱 전용 확인창(사용자 요청: 기본 알림창이 앱과 안 어울림).
// showConfirm(제목, 내용, 버튼들). 버튼 style: 'cancel' = 회색(닫기), 'destructive'/'default' = 검은 버튼.
export type ConfirmButton = {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
};

export type ConfirmRequest = { title: string; message?: string; buttons: ConfirmButton[] };

type ConfirmState = {
  request: ConfirmRequest | null;
  close: () => void;
};

export const useConfirmStore = create<ConfirmState>()((set) => ({
  request: null,
  close: () => set({ request: null }),
}));

export const showConfirm = (title: string, message: string | undefined, buttons: ConfirmButton[]) => {
  useConfirmStore.setState({ request: { title, message, buttons } });
};
