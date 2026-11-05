import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { radii, useColors } from '@/theme';

import { ALPHA_STAGE, imageSizeForInkHeight, stageAt, stageCondition, stageDescription, stageOrdinal } from '../stages';

import { StageIcon } from './StageIcon';

type StageInfoModalProps = {
  // 보여 줄 단계(null이면 닫힘)
  stage: number | null;
  // 이번 달 지금 단계
  current: number;
  onClose: () => void;
};

const ICON_HEIGHT = 96;

// 달력의 퇴화 단계 그림을 누르면 화면 가운데에 뜨는 설명 카드: 큰 그림 + 이름 + 조건 + 지금 상태 + 설명.
export const StageInfoModal = ({ stage, current, onClose }: StageInfoModalProps) => {
  const colors = useColors();
  if (stage === null) return null;

  // 알파메일 달(current가 알파메일)에는 나머지 단계가 "내려가지 않은 모습"이다.
  const status =
    stage === current
      ? '지금 내 모습'
      : current === ALPHA_STAGE
        ? '내려가지 않은 모습'
        : stage < current
          ? '이미 지나온 모습'
          : '아직 오지 않은 모습';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="닫기" onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.background }]} accessibilityViewIsModal>
          <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
            <StageIcon stage={stage} imageSize={imageSizeForInkHeight(stage, ICON_HEIGHT)} />
          </View>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: stage === current ? colors.ink : colors.surface }]}>
              <AppText variant="caption" color={stage === current ? 'onInk' : 'textSecondary'}>
                {status}
              </AppText>
            </View>
            <AppText variant="caption" color="textSecondary">
              {`${stageOrdinal(stage)} · ${stageCondition(stage)}`}
            </AppText>
          </View>
          <AppText variant="heading" style={styles.name}>
            {stageAt(stage).label}
          </AppText>
          <AppText variant="subtitle" color="textSecondary" style={styles.description}>
            {stageDescription(stage)}
          </AppText>
          <Button label="확인" onPress={onClose} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { borderRadius: radii.card, padding: 22 },
  iconBox: { height: 140, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tags: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  name: { marginTop: 10 },
  description: { marginTop: 6 },
  button: { marginTop: 20 },
});
