import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader, AppText, Button, Screen } from '@/components/ui';
import { LAST_STAGE, MAX_FAILURES } from '@/features/history/evolution';
import { StageIcon } from '@/features/history/components/StageIcon';
import { useHistoryStore } from '@/features/history/historyStore';
import { useEvolution } from '@/features/history/useEvolution';
import { useHydrated } from '@/lib/useHydrated';

// 한 달에 5번 실패하면 보이는 화면. 디자인에 없어서 임시로 만든 것이다.
const EndedScreen = () => {
  const router = useRouter();
  const hydrated = useHydrated(useHistoryStore);
  const { ended } = useEvolution();

  if (!hydrated) return <Screen>{null}</Screen>;
  // 달이 바뀌어 다시 시작할 수 있게 되면 할 일 화면으로 돌려보낸다.
  if (!ended) return <Redirect href="/" />;

  return (
    <Screen>
      <AppHeader onPressCalendar={() => router.push('/history')} />
      <View style={styles.center}>
        <StageIcon stage={LAST_STAGE} imageSize={200} />
        <AppText variant="headline" style={styles.title}>
          이번 달은 끝났어요
        </AppText>
        <AppText variant="subtitle" color="textSecondary" style={styles.body}>
          {`${MAX_FAILURES}번 계획을 못 지켰어요. 다음 달 1일에 다시 시작해요.`}
        </AppText>
      </View>
      <Button label="기록 보기" onPress={() => router.push('/history')} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 32 },
  body: { marginTop: 8, textAlign: 'center' },
});

export default EndedScreen;
