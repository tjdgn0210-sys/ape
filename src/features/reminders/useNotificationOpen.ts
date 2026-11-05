import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { usePlanStore } from '@/features/schedule/planStore';
import { dateKeyOf, secondOfDayOf } from '@/lib/time';
import { useHydrated } from '@/lib/useHydrated';

import { START_ACTION_ID } from './reminders';

// 웹에는 알림 모듈이 없어서 훅을 부르면 오류가 난다. 플랫폼은 실행 중 바뀌지 않으므로 처음에 한 번 골라 둔다.
const useLastResponse: () => Notifications.NotificationResponse | null | undefined =
  Platform.OS === 'web' ? () => undefined : Notifications.useLastNotificationResponse;

// 일정 알림을 누르면(앱이 꺼져 있었든 켜져 있었든) 계획표 화면으로 간다.
// 시작 시각 알림의 [시작] 버튼을 누르면 그 할 일을 시작한 것으로 기록한 뒤 계획표로 간다(5분 안이어야 성공).
// 시작 시한이 5분뿐이라 알림 → [시작] 버튼까지 가는 길이 짧아야 한다(사용자 요청).
// ready: 화면 이동이 가능한 때(글꼴·설정을 읽고 Stack을 그린 뒤)
export const useNotificationOpen = (ready: boolean) => {
  const router = useRouter();
  const response = useLastResponse();
  const planReady = useHydrated(usePlanStore);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    // 계획표를 저장소에서 읽기 전에 시작을 기록하면 빈 계획에 적용돼 사라진다.
    if (Platform.OS === 'web' || !ready || !planReady || !response) return;
    const id = `${response.notification.request.identifier}|${response.notification.date}|${response.actionIdentifier}`;
    if (handled.current === id) return;
    handled.current = id;

    const data = response.notification.request.content.data;
    if (response.actionIdentifier === START_ACTION_ID && typeof data?.taskId === 'string') {
      const { plan, start } = usePlanStore.getState();
      // 지난 날의 알림 버튼이면 오늘 계획에 적용하지 않는다. 5분이 지났으면 start가 알아서 무시한다.
      const now = new Date();
      if (plan?.dateKey === dateKeyOf(now)) start(data.taskId, secondOfDayOf(now));
    }
    if (data?.screen === 'schedule') router.replace('/schedule');
  }, [response, ready, planReady, router]);
};
