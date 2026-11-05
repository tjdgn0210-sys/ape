import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { usePlanStore } from '@/features/schedule/planStore';
import { dateKeyOf } from '@/lib/time';
import { useHydrated } from '@/lib/useHydrated';

import { statusSegmentsFor } from './segments';
import { syncStatusNotification } from './syncStatus';

// 오늘 계획이 있는 동안 안드로이드 상단바·잠금화면에 진행 상태를 계속 띄운다(앱을 꺼도 유지).
// 계획이 만들어지거나 완료 체크가 바뀌거나 앱으로 돌아올 때 다시 예약한다.
export const useStatusNotification = () => {
  const ready = useHydrated(usePlanStore);
  const plan = usePlanStore((state) => state.plan);

  useEffect(() => {
    if (Platform.OS !== 'android' || !ready) return;
    const sync = () => {
      const now = new Date();
      const current = usePlanStore.getState().plan;
      void syncStatusNotification(statusSegmentsFor(current, now, dateKeyOf(now)));
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [ready, plan]);
};
