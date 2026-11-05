import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Plan } from '@/features/schedule/types';
import { dateKeyOf, formatClock } from '@/lib/time';

import { eveningRemindersFor } from './evening';
import { morningRemindersFor } from './morning';
import {
  REMINDER_LEAD_MIN,
  START_ACTION_ID,
  START_CATEGORY_ID,
  WARN_BEFORE_DEADLINE_MIN,
  remindersFor,
  type Reminder,
} from './reminders';

const CHANNEL_ID = 'reminders';

// 앱이 켜져 있을 때도 알림이 화면에 보이게 한다.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// 안드로이드에서 알림 채널을 만들었는지. 못 만들었으면(예: Expo Go) 기본 채널로 보낸다.
let channelReady = false;

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return;
  try {
    // 안드로이드 13 이상은 채널이 있어야 권한 창이 뜬다.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '일정 알림',
      importance: Notifications.AndroidImportance.HIGH,
    });
    channelReady = true;
  } catch (error) {
    // 채널 생성이 실패해도 알림 예약은 계속한다.
    channelReady = false;
    console.warn('알림 채널 생성 실패, 기본 채널을 씁니다', error);
  }
};

const ensurePermission = async () => {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
};

// 시작 시각 알림에 붙일 [시작] 버튼을 등록한다. 버튼을 눌러도 앱이 열려야 기록이 저장된다
// (앱이 꺼진 채로 처리하려면 백그라운드 작업 모듈이 필요해서 쓰지 않았다).
const ensureStartCategory = async () => {
  try {
    await Notifications.setNotificationCategoryAsync(START_CATEGORY_ID, [
      { identifier: START_ACTION_ID, buttonTitle: '시작', options: { opensAppToForeground: true } },
    ]);
  } catch (error) {
    // 버튼 없이도 알림은 간다.
    console.warn('알림 버튼 등록 실패', error);
  }
};

// enabled/minute = 아침 계획 알림, eveningEnabled = 계획을 안 짠 날 저녁 알림
export type MorningSetting = { enabled: boolean; minute: number; endedMonthKey: string | null; eveningEnabled: boolean; eveningMinute: number };

const contentOf = (reminder: Reminder) => {
  if (reminder.kind === 'lead') return { title: `${REMINDER_LEAD_MIN}분 뒤 시작해요`, body: `${formatClock(reminder.startMin)} ${reminder.title}` };
  if (reminder.kind === 'start') return { title: '지금 시작하세요', body: `${reminder.title} · ${REMINDER_LEAD_MIN}분 안에 시작을 눌러야 해요` };
  if (reminder.kind === 'warn') return { title: `${WARN_BEFORE_DEADLINE_MIN}분 남았어요`, body: `${reminder.title} · 지금 시작을 누르면 아직 성공이에요` };
  return { title: '시작을 놓쳤어요', body: `${reminder.title} · 오늘은 실패로 기록돼요` };
};

const sync = async (plan: Plan | null, morning: MorningSetting, now: Date) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const reminders = plan === null ? [] : remindersFor(plan, now);
  const hasTodayPlan = plan !== null && plan.dateKey === dateKeyOf(now);
  const mornings = morningRemindersFor({
    enabled: morning.enabled,
    minute: morning.minute,
    endedMonthKey: morning.endedMonthKey,
    now,
    hasTodayPlan,
  });
  const evenings = eveningRemindersFor({
    enabled: morning.eveningEnabled,
    minute: morning.eveningMinute,
    endedMonthKey: morning.endedMonthKey,
    now,
    hasTodayPlan,
  });
  if (reminders.length + mornings.length + evenings.length === 0 || !(await ensurePermission())) return;
  await ensureStartCategory();

  await Promise.all([
    ...mornings.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: '오늘 계획 짜세요',
          body: '쓸 수 있는 시간과 할 일만 고르면 시간표는 자동으로 만들어져요.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          ...(channelReady ? { channelId: CHANNEL_ID } : {}),
        },
      }),
    ),
    // 계획을 안 짠 날 저녁: 자정 전에 하나만 시작해도 오늘 연속 기록이 이어진다.
    ...evenings.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: '오늘 계획이 아직 없어요',
          body: '자정 전에 할 일 하나만 정하고 시작해도 연속 기록이 이어져요.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          ...(channelReady ? { channelId: CHANNEL_ID } : {}),
        },
      }),
    ),
    ...reminders.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          ...contentOf(reminder),
          // 알림을 누르면 계획표 화면으로 간다(useNotificationOpen). 시작 시한이 5분뿐이라 바로 [시작]을 누를 수 있게.
          // 시작 시각·마감 2분 전 알림에는 알림 안에 [시작] 버튼도 붙는다(5분 전·놓침 알림은 누를 수 있는 때가 아니라서 없다).
          data: { screen: 'schedule', taskId: reminder.taskId },
          ...(reminder.kind === 'start' || reminder.kind === 'warn' ? { categoryIdentifier: START_CATEGORY_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          ...(channelReady ? { channelId: CHANNEL_ID } : {}),
        },
      }),
    ),
  ]);
};

// 연달아 호출돼도 한 번에 하나씩, 마지막 호출의 결과가 남도록 순서대로 처리한다.
let queue: Promise<void> = Promise.resolve();

// 오늘 계획표(시작 5분 전·시작 시각)와 아침 계획 알림을 모두 다시 맞춘다.
export const syncReminders = (plan: Plan | null, morning: MorningSetting, now: Date = new Date()) => {
  if (Platform.OS === 'web') return queue;
  queue = queue
    .then(() => sync(plan, morning, now))
    .catch((error: unknown) => {
      // 알림이 안 되어도 앱은 계속 써야 하므로 기록만 남긴다.
      console.warn('알림 예약 실패', error);
    });
  return queue;
};
