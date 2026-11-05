import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StageIcon } from '@/features/history/components/StageIcon';
import { imageSizeForInkHeight } from '@/features/history/stages';
import { LAST_STAGE } from '@/features/history/evolution';
import { layout, useFontScale } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

// 로고는 이번 달 실패 횟수에 맞는 진화 단계 그림이다. 보이는 높이를 제목 글자(25pt) 크기에 맞추고, 글자 크기 설정을 따라 같이 커진다.
const LOGO_INK_HEIGHT = 16;
// 제목 옆 로고는 항상 마지막 단계(유인원) 그림이다(사용자 요청). 높이는 제목 한글 글자 높이에 맞춘다.
const LOGO_STAGE = LAST_STAGE;
const LOGO_GAP = 10;

type AppHeaderProps = {
  onPressCalendar?: () => void;
  onPressSettings?: () => void;
};

// 터치 영역은 44pt를 확보하되, 보이는 아이콘은 디자인(약 20pt) 그대로 둔다.
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

export const AppHeader = ({ onPressCalendar, onPressSettings }: AppHeaderProps) => {
  const router = useRouter();
  const fontScale = useFontScale();

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        {/* 앱 이름은 화면 제목보다 작고 회색으로: 눈에 띄는 건 화면의 제목이어야 한다(리디자인). */}
        <AppText variant="body" color="textTertiary">
          못지키면 유인원
        </AppText>
        <View style={styles.logo}>
          <StageIcon stage={LOGO_STAGE} tint="ink" imageSize={imageSizeForInkHeight(LOGO_STAGE, LOGO_INK_HEIGHT * fontScale)} />
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="설정" hitSlop={HIT_SLOP} onPress={onPressSettings ?? (() => router.push('/settings'))}>
          <Icon name="gear" size={20} color="ink" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: LOGO_GAP },
  logo: { transform: [{ translateY: -1 }] },
  // 디자인에서 아이콘 오른쪽 끝이 화면 여백(24pt)보다 7pt 안쪽(x=362)에 있다.
  actions: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingRight: 7 },
});
