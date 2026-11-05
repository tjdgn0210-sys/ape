import { IBMPlexSansKR_700Bold } from '@expo-google-fonts/ibm-plex-sans-kr';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';

import { FlyingApeHost } from '@/features/schedule/components/FlyingApeHost';
import { ConfirmHost } from '@/features/confirm/ConfirmHost';
import { showConfirm, useConfirmStore } from '@/features/confirm/confirmStore';
import { DevolutionNotice } from '@/features/history/components/DevolutionNotice';
import { RecoveryNotice } from '@/features/history/components/RecoveryNotice';
import { useSettlement } from '@/features/history/useSettlement';
import { useLiveActivity } from '@/features/liveActivity/useLiveActivity';
import { useNotificationOpen } from '@/features/reminders/useNotificationOpen';
import { useReminders } from '@/features/reminders/useReminders';
import { useStatusNotification } from '@/features/statusNotification/useStatusNotification';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { IntroWalk } from '@/features/intro/IntroWalk';
import { TutorialHost } from '@/features/tutorial/TutorialHost';
import { useHydrated } from '@/lib/useHydrated';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

// 앱 화면의 최대 폭(pt). 폰보다 넓은 화면에서는 이 폭으로 가운데 정렬한다.
export const MAX_APP_WIDTH = 520;
const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH },
});

// 안드로이드: 첫 화면에서 뒤로 가기를 누르면 바로 꺼지지 않고 "종료하시겠습니까?"를 묻는다(유인원 아이콘 + [취소][확인]).
// 더 돌아갈 화면이 있으면(설정 등) 평소처럼 한 화면 뒤로 간다. 아이폰·웹에는 앱 종료 개념이 없어 아무 일도 안 한다.
const useExitConfirm = () => {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // 다른 확인창이 떠 있으면 그 창이 먼저 닫히게 둔다.
      if (useConfirmStore.getState().request !== null) return false;
      if (router.canGoBack()) return false;
      showConfirm('종료하시겠습니까?', undefined, [
        { text: '취소', style: 'cancel' },
        { text: '확인', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => subscription.remove();
  }, [router]);
};

const RootLayout = () => {
  const [fontsLoaded, fontError] = useFonts({ IBMPlexSansKR_700Bold });
  const settingsHydrated = useHydrated(useSettingsStore);
  const theme = useSettingsStore((state) => state.theme);
  const colors = useColors();
  // 저장된 화면 모드를 읽기 전에 그리면 다크 모드 사용자에게 흰 화면이 번쩍 보인다.
  const ready = (fontsLoaded || fontError !== null) && settingsHydrated;

  // 날짜가 바뀐 뒤 남은 지난 계획표를 기록으로 확정한다(실패 판정).
  useSettlement();
  // 할 일 시작 5분 전 알림과 아침 계획 알림을 계획표에 맞춰 예약한다.
  useReminders();
  // 일정 알림을 누르면 계획표 화면으로 간다.
  useNotificationOpen(ready);
  // 지금 일정을 잠금화면(Live Activity)에 보여 준다(iOS 개발 빌드).
  useLiveActivity();
  // 안드로이드: 계획이 진행 중이면 상단바·잠금화면에 지금 일정·남은 시간·다음 일정을 계속 띄운다(개발 빌드).
  useStatusNotification();
  // 안드로이드 뒤로 가기: 첫 화면에서는 종료 확인.
  useExitConfirm();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {/* 넓은 화면(웹·태블릿)에서는 폰 폭(최대 pt)으로 가운데에 두어 화면이 늘어나 깨지지 않게 한다. */}
      <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
      <Stack
        screenOptions={{
          headerShown: false,
          // 단계가 넘어갈 때 옆으로 밀려 들어온다(안드로이드 기본값은 아래에서 올라오는 효과라서 지정한다).
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* 하단 탭으로 오가는 화면은 옆으로 밀지 않고 부드럽게 바뀐다. */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        {/* 1~3단계는 화면이 움직이지 않고 그 자리에서 바뀐다. 위의 진행 바가 한 칸씩 차오른다. */}
        <Stack.Screen name="tasks" options={{ animation: 'none' }} />
        <Stack.Screen name="break" options={{ animation: 'none' }} />
        <Stack.Screen name="schedule" options={{ animation: 'fade' }} />
        <Stack.Screen name="history" options={{ animation: 'fade' }} />
      </Stack>
      </View>
      </View>
      <DevolutionNotice />
      {/* 연속 성공으로 실패 1회가 지워졌을 때의 안내 */}
      <RecoveryNotice />
      {/* 앱 전용 확인창(Alert 대신) */}
      <ConfirmHost />
      {/* 시작할 때 날아가는 유인원(화면 전체 위) */}
      <FlyingApeHost />
      {/* 앱을 켤 때 유인원이 걸어가는 첫 화면(실행할 때마다 한 번) */}
      <IntroWalk />
      {/* 처음 쓰는 사용자에게 한 번 보여 주는 튜토리얼(앱 시작 화면이 끝난 뒤) */}
      <TutorialHost />
    </>
  );
};

export default RootLayout;
