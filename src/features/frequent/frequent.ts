import type { TaskDraft } from '@/features/tasks/types';

// 예전에 입력한 할 일. 같은 제목을 다시 쓸수록 count가 올라간다.
export type FrequentTask = TaskDraft & { count: number; usedAt: number };

export const FREQUENT_LIMIT = 20;
export const SUGGESTION_LIMIT = 8;

// 제목이 같으면 한 개로 합치고 중요도·시간은 가장 최근 값으로 바꾼다.
export const recordFrequent = (items: readonly FrequentTask[], draft: TaskDraft, usedAt: number): FrequentTask[] => {
  const title = draft.title.trim();
  const previous = items.find((item) => item.title === title);
  const entry: FrequentTask = {
    title,
    importance: draft.importance,
    minutes: draft.minutes,
    count: (previous?.count ?? 0) + 1,
    usedAt,
  };
  return rank([entry, ...items.filter((item) => item.title !== title)]).slice(0, FREQUENT_LIMIT);
};

const rank = (items: readonly FrequentTask[]) =>
  [...items].sort((a, b) => b.count - a.count || b.usedAt - a.usedAt);

// 지금 목록에 이미 있는 제목은 빼고, 많이 쓴 순으로 보여 준다.
export const suggestionsFor = (items: readonly FrequentTask[], listedTitles: readonly string[]): FrequentTask[] =>
  rank(items.filter((item) => !listedTitles.includes(item.title))).slice(0, SUGGESTION_LIMIT);
