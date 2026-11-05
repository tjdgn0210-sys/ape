import { FONT_SCALE, useSettingsStore } from '@/features/settings/settingsStore';

import { palettes } from './colors';

export const useColors = () => palettes[useSettingsStore((state) => state.theme)];

export const useFontScale = () => FONT_SCALE[useSettingsStore((state) => state.fontSize)];
