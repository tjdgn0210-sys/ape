import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { nextActivityAction, type ActivityView } from './activityView';

const ID_KEY = 'yuinwon.liveActivityId';
const IMAGE_PREFIX = 'ape';

// 잠금화면 카드 색: 디자인의 어두운 카드(#242424), 흰 글자, 회색 보조 글자.
const CONFIG = {
  backgroundColor: '#242424',
  titleColor: '#FFFFFF',
  subtitleColor: '#AAAAAA',
  progressViewTint: '#FFFFFF',
  progressViewLabelColor: '#FFFFFF',
  deepLinkUrl: '/schedule',
  timerType: 'digital',
  padding: { horizontal: 20, vertical: 18 },
  imagePosition: 'right',
  imageAlign: 'center',
  imageSize: { width: 48, height: 48 },
  contentFit: 'contain',
} as const;

type LiveActivityModule = typeof import('expo-live-activity');

// iOS 개발 빌드에서만 네이티브 모듈이 있다(웹·안드로이드·Expo Go에는 없다).
const load = (): LiveActivityModule | null => {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('expo-live-activity') as LiveActivityModule;
  } catch {
    return null;
  }
};

const toState = (view: ActivityView, stageIndex: number) => ({
  title: view.title,
  subtitle: view.subtitle,
  ...(view.endAtMs === null ? {} : { progressBar: { date: view.endAtMs } }),
  imageName: `${IMAGE_PREFIX}${stageIndex}`,
});

// 지금 떠 있는 활동(앱을 다시 켜도 이어 쓰도록 id를 저장해 둔다)
let current: { id: string; key: string | null } | null = null;
let restored = false;
// 연달아 호출돼도 순서대로 처리한다.
let queue: Promise<void> = Promise.resolve();

const restore = async () => {
  if (restored) return;
  restored = true;
  const id = await AsyncStorage.getItem(ID_KEY);
  if (id !== null) current = { id, key: null };
};

const remember = async (id: string | null) => {
  if (id === null) await AsyncStorage.removeItem(ID_KEY);
  else await AsyncStorage.setItem(ID_KEY, id);
};

const run = async (view: ActivityView | null, stageIndex: number) => {
  const module = load();
  if (module === null) return;
  await restore();

  const action = nextActivityAction(current?.key ?? null, current !== null, view);
  if (action === 'none') return;

  if (action === 'stop') {
    if (current !== null) {
      try {
        module.stopActivity(current.id, view === null ? { title: '계획표 없음' } : toState(view, stageIndex));
      } catch {
        // 이미 사라진 활동이면 그대로 둔다.
      }
    }
    current = null;
    await remember(null);
    return;
  }

  if (view === null) return;
  const state = toState(view, stageIndex);

  if (action === 'update' && current !== null) {
    try {
      module.updateActivity(current.id, state);
      current = { id: current.id, key: view.key };
      return;
    } catch {
      // 사용자가 지웠거나 이미 끝난 활동이면 새로 시작한다.
      current = null;
    }
  }

  const id = module.startActivity(state, CONFIG);
  current = id === undefined ? null : { id, key: view.key };
  await remember(id ?? null);
};

// 잠금화면 표시를 지금 계획표에 맞춘다. 켜져 있지 않거나 권한이 없어도 앱은 계속 동작한다.
export const syncLiveActivity = (view: ActivityView | null, stageIndex: number) => {
  queue = queue.then(() => run(view, stageIndex)).catch((error: unknown) => {
    console.warn('잠금화면 표시 실패', error);
  });
  return queue;
};
