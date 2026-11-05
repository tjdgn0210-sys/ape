import { formatClock12 } from '@/lib/time';

import type { BreakMode, PlanItem } from './types';

// 정해진 쉬는 시간과 끝나는 시각을 한 줄로 알려 준다(자동일 때). 할 일이 없거나 "직접"이면 null.
export const describeBreaks = (items: readonly PlanItem[], mode: BreakMode): string | null => {
  if (mode !== 'auto' || items.length === 0) return null;
  const lengths = items.flatMap((item) => (item.kind === 'break' ? [item.endMin - item.startMin] : []));
  // 시간 설정 카드와 같은 12시간제("오후 4:15")로 보여 준다.
  const endClock = formatClock12(Math.max(...items.map((item) => item.endMin)));
  const end = `${endClock.period} ${endClock.text}`;
  if (lengths.length === 0) return `${end}에 끝나요`;
  const total = lengths.reduce((a, b) => a + b, 0);
  return `쉬는 시간 총 ${total}분 · ${end}에 끝나요`;
};
