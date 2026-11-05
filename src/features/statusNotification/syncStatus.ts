import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { askExactAlarmOnce } from './exactAlarm';
import type { StatusSegment } from './segments';

// 안드로이드 상단바·잠금화면에 "지금 일정 + 남은 시간(거꾸로 가는 시계) + 다음 일정"을 계속 띄운다.
// @notifee/react-native를 쓴다(거꾸로 가는 시계·자동으로 사라지는 시간·정확한 예약이 expo-notifications에는 없음).
// Expo Go에는 이 라이브러리가 없어서 아무 일도 하지 않는다(개발 빌드에서만 동작).
const CHANNEL_ID = 'plan-status';
const ID_PREFIX = 'plan-status-';

type Notifee = typeof import('@notifee/react-native');

let cached: Notifee | null | undefined;
const loadNotifee = (): Notifee | null => {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'android' || Constants.executionEnvironment === 'storeClient') return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('@notifee/react-native') as Notifee;
  } catch {
    cached = null;
  }
  return cached;
};

let channelReady = false;

export const syncStatusNotification = async (segments: readonly StatusSegment[]) => {
  const module = loadNotifee();
  if (module === null) return;
  const notifee = module.default;
  const { AndroidImportance, AndroidVisibility, AndroidCategory, TriggerType } = module;

  try {
    // 예전 예약·표시를 모두 지우고 다시 건다(계획·완료 표시가 바뀔 때마다).
    const triggerIds = (await notifee.getTriggerNotificationIds()).filter((id) => id.startsWith(ID_PREFIX));
    const shown = (await notifee.getDisplayedNotifications())
      .map((item) => item.id ?? item.notification.id ?? '')
      .filter((id) => id.startsWith(ID_PREFIX));
    await notifee.cancelTriggerNotifications(triggerIds);
    await notifee.cancelDisplayedNotifications(shown);
    if (segments.length === 0) return;

    await notifee.requestPermission();
    void askExactAlarmOnce(module);
    if (!channelReady) {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: '진행 중인 계획',
        description: '지금 일정과 남은 시간, 다음 일정을 상단바에 계속 보여 줘요',
        importance: AndroidImportance.LOW, // 소리·진동 없이 조용히 떠 있게
        visibility: AndroidVisibility.PUBLIC, // 잠금화면에도 내용을 보여 준다
        vibration: false,
      });
      channelReady = true;
    }

    const nowMs = Date.now();
    for (const [index, segment] of segments.entries()) {
      const notification = {
        id: `${ID_PREFIX}${index}`,
        title: segment.title,
        body: segment.body,
        android: {
          channelId: CHANNEL_ID,
          ongoing: true, // 밀어서 지울 수 없게(계획이 진행 중인 동안)
          onlyAlertOnce: true,
          autoCancel: false,
          category: AndroidCategory.PROGRESS,
          visibility: AndroidVisibility.PUBLIC,
          showChronometer: true,
          chronometerDirection: 'down' as const,
          timestamp: segment.endAtMs, // 이 시각까지 남은 시간이 저절로 줄어든다
          showTimestamp: true,
          // 이 구간이 끝나면 저절로 사라지고 다음 구간 알림이 뜬다
          timeoutAfter: Math.max(1000, segment.untilMs - Math.max(nowMs, segment.startMs)),
          pressAction: { id: 'default' },
        },
      };
      if (segment.startMs <= nowMs) {
        await notifee.displayNotification(notification);
        continue;
      }
      const trigger = { type: TriggerType.TIMESTAMP, timestamp: segment.startMs } as const;
      try {
        // 정확한 시각에 바뀌게(정확한 알람 권한이 없는 기기에서는 실패할 수 있다)
        await notifee.createTriggerNotification(notification, { ...trigger, alarmManager: { allowWhileIdle: true } });
      } catch {
        // 권한이 없으면 대략적인 시각(몇 분 늦을 수 있음)으로 예약한다.
        await notifee.createTriggerNotification(notification, trigger);
      }
    }
  } catch (error) {
    console.warn('상단바 진행 표시 실패', error);
  }
};
