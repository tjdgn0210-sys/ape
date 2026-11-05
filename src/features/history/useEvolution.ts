import { useMemo } from 'react';

import { useNow } from '@/features/schedule/useNow';
import { dateKeyOf } from '@/lib/time';

import { failuresIn, isEnded, monthKeyOf, stageIndexFor } from './evolution';
import { useHistoryStore } from './historyStore';

// 이번 달 실패 횟수로 지금 단계와 종료 여부를 구한다. 달이 바뀌면(자정) 저절로 0으로 돌아간다.
export const useEvolution = () => {
  const records = useHistoryStore((state) => state.records);
  const now = useNow(60_000);

  return useMemo(() => {
    const failures = failuresIn(records, monthKeyOf(dateKeyOf(now)));
    return { failures, stageIndex: stageIndexFor(failures), ended: isEnded(failures) };
  }, [records, now]);
};
