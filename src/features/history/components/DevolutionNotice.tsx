import { usePathname, useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { radii, useColors } from '@/theme';

import { MAX_FAILURES } from '../evolution';
import { useHistoryStore } from '../historyStore';
import { stageAt } from '../stages';

import { StageIcon } from './StageIcon';

const ICON_IMAGE_SIZE = 96;

// "2026-10-22" -> "10월 22일"
const dayOf = (dateKey: string) => {
  const [, m = 0, d = 0] = dateKey.split('-').map(Number);
  return `${m}월 ${d}일`;
};

// 실패가 확정되면 한 번 보여 주는 안내. 디자인에 없는 화면이라 임시로 만든 것이다.
export const DevolutionNotice = () => {
  const notice = useHistoryStore((state) => state.notice);
  const dismiss = useHistoryStore((state) => state.dismissNotice);
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();

  if (notice === null) return null;

  // 확인을 누르면 달력으로 가서 실패한 날에 유인원이 쾅 박히는 모습을 보여 준다.
  const confirm = () => {
    dismiss();
    if (pathname !== '/history') router.push('/history');
  };

  const from = stageAt(notice.fromStage);
  const to = stageAt(notice.toStage);
  const changed = notice.fromStage !== notice.toStage;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.cardBg }]} accessibilityViewIsModal>
          <AppText variant="cardTitle" color="onCard">
            {notice.ended ? '이번 달은 끝났어요' : '한 단계 퇴화했어요'}
          </AppText>
          <AppText variant="subtitle" color="onCardMuted" style={styles.body}>
            {`${dayOf(notice.dateKey)} 계획을 다 지키지 못했어요. 이번 달 ${notice.failNo}/${MAX_FAILURES}번째 실패예요.`}
          </AppText>

          <View style={styles.icons}>
            {changed ? (
              <>
                <StageIcon stage={notice.fromStage} imageSize={ICON_IMAGE_SIZE} opacity={0.4} tint="onCard" />
                <AppText variant="heading" color="onCardMuted">
                  →
                </AppText>
              </>
            ) : null}
            <StageIcon stage={notice.toStage} imageSize={ICON_IMAGE_SIZE} tint="onCard" />
          </View>
          <AppText variant="label" color="onCard" style={styles.stageName}>
            {changed ? `${from.label} → ${to.label}` : to.label}
          </AppText>

          {notice.ended ? (
            <AppText variant="subtitle" color="onCardMuted" style={styles.body}>
              {`${MAX_FAILURES}번 실패해서 이번 달은 여기서 끝나요. 다음 달 1일에 다시 시작해요.`}
            </AppText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="달력에서 보기"
            onPress={confirm}
            style={[styles.button, { backgroundColor: colors.onCard }]}
          >
            <AppText variant="button" color="cardBg">
              달력에서 보기
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderRadius: radii.card, padding: 24 },
  body: { marginTop: 10 },
  icons: { marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: 80 },
  stageName: { marginTop: 16, textAlign: 'center' },
  button: {
    marginTop: 28,
    height: 56,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
