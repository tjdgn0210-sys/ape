import type { PlanItem } from './types';

// 완료하거나 휴식을 건너뛰면 다음 일정이 바로 시작된다(사용자 요청).
// index번 일정을 atMin(지금 분)에서 끊고, 뒤의 일정을 모두 그만큼 앞당긴다(길이는 그대로).
// 길이가 0이 된 휴식은 없앤다(할 일은 완료 기록 때문에 남긴다).
export const cutAndPullForward = (items: readonly PlanItem[], index: number, atMin: number): PlanItem[] => {
  const target = items[index];
  if (target === undefined) return [...items];
  const newEnd = Math.min(Math.max(atMin, target.startMin), target.endMin);
  const shift = target.endMin - newEnd;
  if (shift <= 0) return [...items];
  return items.flatMap((item, i): PlanItem[] => {
    if (i < index) return [item];
    if (i === index) {
      if (item.kind === 'break' && newEnd === item.startMin) return [];
      return [{ ...item, endMin: newEnd }];
    }
    return [{ ...item, startMin: item.startMin - shift, endMin: item.endMin - shift }];
  });
};
