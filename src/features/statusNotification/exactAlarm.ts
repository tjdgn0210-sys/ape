import AsyncStorage from '@react-native-async-storage/async-storage';

import { showConfirm } from '@/features/confirm/confirmStore';

type Notifee = typeof import('@notifee/react-native');

const ASKED_KEY = 'yuinwon.exactAlarmAsked';

// 안드로이드 14부터는 "알람 및 리마인더" 권한을 사용자가 켜 줘야 정확한 시각에 알림이 뜬다.
// 꺼져 있으면 알림이 몇 분 늦을 수 있어서, 시작 시한이 5분뿐인 이 앱에서는 치명적이다.
// 처음 한 번만 안내하고 설정 화면으로 보내 준다(사용자가 나중에 누르면 다시 묻지 않는다). 개발 빌드(notifee)에서만 동작한다.
export const askExactAlarmOnce = async (module: Notifee) => {
  try {
    if ((await AsyncStorage.getItem(ASKED_KEY)) !== null) return;
    const settings = await module.default.getNotificationSettings();
    if (settings.android.alarm !== module.AndroidNotificationSetting.DISABLED) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    showConfirm(
      '알람 권한을 켜 주세요',
      '시작 시간에 맞춰 알림이 정확히 오려면 "알람 및 리마인더" 권한이 필요해요. 꺼져 있으면 알림이 몇 분 늦을 수 있어요.',
      [
        { text: '나중에', style: 'cancel' },
        { text: '설정 열기', onPress: () => void module.default.openAlarmPermissionSettings() },
      ],
    );
  } catch (error) {
    console.warn('알람 권한 확인 실패', error);
  }
};
