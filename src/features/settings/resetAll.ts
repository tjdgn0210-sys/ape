import { useFrequentStore } from '@/features/frequent/frequentStore';
import { useHistoryStore } from '@/features/history/historyStore';
import { useRoutineStore } from '@/features/routines/routineStore';
import { useDraftStore } from '@/features/schedule/draftStore';
import { useLastPlanStore } from '@/features/schedule/lastPlanStore';
import { usePlanStore } from '@/features/schedule/planStore';
import { usePrefsStore } from '@/features/schedule/prefsStore';
import { useStartEffectStore } from '@/features/schedule/startEffectStore';
import { usePreviousPlanStore } from '@/features/tasks/previousPlanStore';
import { useTaskStore } from '@/features/tasks/taskStore';
import { dateKeyOf } from '@/lib/time';

import { useSettingsStore } from './settingsStore';

// 설정의 [초기화]: 앱을 처음 설치한 상태로 되돌린다(할 일, 계획표, 달력 기록, 반복 할 일, 자주 한 일, 쉬는 시간 설정, 화면 설정).
// 각 저장소를 처음 값으로 바꾸면 저장(AsyncStorage)도 그 값으로 덮어써진다.
// 알림과 잠금화면 카드는 계획표가 비면 각자 알아서 지운다(useReminders, useLiveActivity).
export const resetAll = () => {
  const stores = [
    useTaskStore,
    usePreviousPlanStore,
    useLastPlanStore,
    usePlanStore,
    useHistoryStore,
    useRoutineStore,
    useFrequentStore,
    usePrefsStore,
    useSettingsStore,
    useDraftStore,
    useStartEffectStore,
  ] as const;
  for (const store of stores) {
    // 두 번째 인자 true = 합치지 않고 통째로 바꾼다(처음 값에 동작 함수도 들어 있다).
    (store.setState as (state: unknown, replace: true) => void)(store.getInitialState(), true);
  }
  // 초기화한 날이 다시 "처음 쓴 날"이다(달력의 "계획 없음" 점 기준). 안 하면 다음에 앱을 켤 때까지 비어 있다.
  useHistoryStore.getState().markStarted(dateKeyOf(new Date()));
};
