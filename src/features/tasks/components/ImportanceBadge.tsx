import { AppText } from '@/components/ui';

import { IMPORTANCE_LABEL, type Importance } from '../types';

// 중요도는 상자 없이 글자의 진하기로 보여 준다: 높음 = 진한 검정, 보통 = 중간 회색, 낮음 = 연한 회색.
// 중요한 일은 눈에 띄고 덜 중요한 일은 물러난다(리디자인).
export const IMPORTANCE_TEXT_COLOR = { high: 'ink', medium: 'textSecondary', low: 'textMuted' } as const;

type ImportanceBadgeProps = { level: Importance };

export const ImportanceBadge = ({ level }: ImportanceBadgeProps) => (
  <AppText variant="subtitle" color={IMPORTANCE_TEXT_COLOR[level]}>
    {IMPORTANCE_LABEL[level]}
  </AppText>
);
