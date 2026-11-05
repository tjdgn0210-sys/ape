import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useEvolution } from '@/features/history/useEvolution';
import { usePlanStore } from '@/features/schedule/planStore';
import { useNow } from '@/features/schedule/useNow';
import { dateKeyOf, secondOfDayOf } from '@/lib/time';
import { useHydrated } from '@/lib/useHydrated';

import { activityViewFor } from './activityView';
import { syncLiveActivity } from './syncActivity';

// 오늘 계획표의 지금 상태를 잠금화면(Live Activity)에 보여 준다. iOS 개발 빌드에서만 동작한다.
// 앱이 켜져 있는 동안 일정이 바뀔 때마다 내용을 바꾼다. 앱이 꺼진 사이에는 남은 시간 줄어듦만 저절로 이어진다.
export const useLiveActivity = () => {
  const ready = useHydrated(usePlanStore);
  const plan = usePlanStore((state) => state.plan);
  const { stageIndex } = useEvolution();
  const now = useNow(1000);

  const view = activityViewFor(plan, secondOfDayOf(now), now.getTime(), dateKeyOf(now));
  const key = view === null ? null : `${view.key}|${stageIndex}`;

  const latest = useRef({ view, stageIndex });
  latest.current = { view, stageIndex };

  useEffect(() => {
    if (Platform.OS !== 'ios' || !ready) return;
    void syncLiveActivity(latest.current.view, latest.current.stageIndex);
  }, [ready, key]);
};
