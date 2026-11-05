import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { radii, useColors } from '@/theme';

import { MAX_FAILURES, RECOVERY_STREAK, failuresIn, monthKeyOf } from '../evolution';
import { useHistoryStore } from '../historyStore';
import { stageAt } from '../stages';

import { StageIcon } from './StageIcon';

const ICON_IMAGE_SIZE = 96;

// "2026-10-22" -> "10월 22일"
const dayOf = (dateKey: string) => {
  const [, m = 0, d = 0] = dateKey.split('-').map(Number);
  return `${m}월 ${d}일`;
};

// 같은 달에 연속으로 제때 시작해서 실패 1회가 지워지면 한 번 보여 주는 안내(사용자 결정: 3일 연속 → 실패 1회 지움).
// 퇴화 안내(DevolutionNotice)와 같은 모양이다. 퇴화 안내가 떠 있는 동안에는 기다린다.
export const RecoveryNotice = () => {
  const recovery = useHistoryStore((state) => state.recovery);
  const pendingDevolution = useHistoryStore((state) => state.notice !== null);
  const records = useHistoryStore((state) => state.records);
  const dismiss = useHistoryStore((state) => state.dismissRecovery);
  const colors = useColors();

  if (recovery === null || pendingDevolution) return null;

  const failures = failuresIn(records, monthKeyOf(recovery.dateKey));
  const from = stageAt(recovery.fromStage);
  const to = stageAt(recovery.toStage);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.cardBg }]} accessibilityViewIsModal>
          <AppText variant="cardTitle" color="onCard">
            한 단계 회복했어요
          </AppText>
          <AppText variant="subtitle" color="onCardMuted" style={styles.body}>
            {`${RECOVERY_STREAK}일 연속으로 제때 시작해서 ${dayOf(recovery.forgivenKey)}의 실패가 지워졌어요. 이번 달 ${failures}/${MAX_FAILURES}번이에요.`}
          </AppText>

          <View style={styles.icons}>
            <StageIcon stage={recovery.fromStage} imageSize={ICON_IMAGE_SIZE} opacity={0.4} tint="onCard" />
            <AppText variant="heading" color="onCardMuted">
              →
            </AppText>
            <StageIcon stage={recovery.toStage} imageSize={ICON_IMAGE_SIZE} tint="onCard" />
          </View>
          <AppText variant="label" color="onCard" style={styles.stageName}>
            {`${from.label} → ${to.label}`}
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="확인"
            onPress={dismiss}
            style={[styles.button, { backgroundColor: colors.onCard }]}
          >
            <AppText variant="button" color="cardBg">
              확인
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
