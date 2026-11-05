import type { TaskDraft } from '@/features/tasks/types';

// 반복 할 일. days는 Date.getDay() 기준(0=일 … 6=토)이고 작은 수부터 정렬해 저장한다.
export type Routine = TaskDraft & { id: string; days: number[] };

export const ALL_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
// 화면에는 월요일부터 보여 준다.
export const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const sameDays = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((day, index) => day === b[index]);

// [1,3] -> "월·수", 모두 -> "매일", 월~금 -> "평일"
export const describeDays = (days: readonly number[]) => {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return '매일';
  if (sameDays(sorted, WEEKDAYS)) return '평일';
  if (sameDays(sorted, WEEKEND)) return '주말';
  return WEEK_ORDER.filter((day) => sorted.includes(day))
    .map((day) => WEEKDAY_LABEL[day])
    .join('·');
};

export const toggleDay = (days: readonly number[], day: number) =>
  (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]).sort((a, b) => a - b);
