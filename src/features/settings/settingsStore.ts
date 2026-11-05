import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ThemeName } from '@/theme/colors';

export type FontSizeName = 'small' | 'normal' | 'large' | 'xlarge';

// 모든 글자(와 헤더 로고)에 곱하는 배율. 보통 = 디자인 그대로.
export const FONT_SCALE: Record<FontSizeName, number> = { small: 0.9, normal: 1, large: 1.12, xlarge: 1.25 };
export const FONT_SIZE_ORDER: readonly FontSizeName[] = ['small', 'normal', 'large', 'xlarge'];
export const FONT_SIZE_LABEL: Record<FontSizeName, string> = {
  small: '작게',
  normal: '보통',
  large: '크게',
  xlarge: '아주 크게',
};

export const THEME_ORDER: readonly ThemeName[] = ['light', 'dark'];
export const THEME_LABEL: Record<ThemeName, string> = { light: '화이트', dark: '다크' };

type SettingsState = {
  theme: ThemeName;
  fontSize: FontSizeName;
  // 아침 계획 알림: 켜기/끄기와 시각(하루 중 분)
  morningEnabled: boolean;
  morningMinute: number;
  // 저녁 알림(계획을 안 짠 날 정한 시각에 한 번): 켜기/끄기와 시각(하루 중 분, 기본 21:00)
  eveningEnabled: boolean;
  eveningMinute: number;
  // 처음 쓰는 사용자용 튜토리얼을 봤는지(사용자 요청). 설정에서 다시 볼 수 있다(false로 되돌림).
  tutorialSeen: boolean;
  setTutorialSeen: (seen: boolean) => void;
  setTheme: (theme: ThemeName) => void;
  setFontSize: (fontSize: FontSizeName) => void;
  setMorningEnabled: (enabled: boolean) => void;
  setMorningMinute: (minute: number) => void;
  setEveningEnabled: (enabled: boolean) => void;
  setEveningMinute: (minute: number) => void;
};

type PersistedSettingsState = Pick<
  SettingsState,
  'theme' | 'fontSize' | 'morningEnabled' | 'morningMinute' | 'eveningEnabled' | 'eveningMinute' | 'tutorialSeen'
>;

// 기본값은 켜짐, 오전 9시(Estimate).
export const DEFAULT_MORNING_MINUTE = 9 * 60;
export const DEFAULT_EVENING_MINUTE = 21 * 60;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      fontSize: 'normal',
      morningEnabled: true,
      morningMinute: DEFAULT_MORNING_MINUTE,
      eveningEnabled: true,
      eveningMinute: DEFAULT_EVENING_MINUTE,
      tutorialSeen: false,
      setTutorialSeen: (tutorialSeen) => set({ tutorialSeen }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setMorningEnabled: (morningEnabled) => set({ morningEnabled }),
      setMorningMinute: (morningMinute) => set({ morningMinute }),
      setEveningEnabled: (eveningEnabled) => set({ eveningEnabled }),
      setEveningMinute: (eveningMinute) => set({ eveningMinute }),
    }),
    {
      name: 'yuinwon.settings',
      version: 0,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedSettingsState => ({
        theme: state.theme,
        fontSize: state.fontSize,
        morningEnabled: state.morningEnabled,
        morningMinute: state.morningMinute,
        eveningEnabled: state.eveningEnabled,
        eveningMinute: state.eveningMinute,
        tutorialSeen: state.tutorialSeen,
      }),
    },
  ),
);
