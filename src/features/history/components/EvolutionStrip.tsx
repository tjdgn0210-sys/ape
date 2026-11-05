import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';

import { LAST_STAGE, MAX_FAILURES, stageIndexFor } from '../evolution';
import { ALPHA_STAGE, STAGE_ICON_HEIGHT, imageSizeForInkHeight, stageAt } from '../stages';

import { StageIcon } from './StageIcon';
import { StageInfoModal } from './StageInfoModal';

// 그림 높이는 stages.ts의 STAGE_ICON_HEIGHT(현대인 최대 → 갈수록 작게). 달력의 못 지킨 날 그림도 같은 크기다.
const ROW_HEIGHT_NORMAL = 40;
const ROW_HEIGHT_PERFECT = 46;

type EvolutionStripProps = {
  // 보고 있는 달의 확정된 실패 횟수
  failures: number;
  // 오늘 못 지켜서 자정에 한 단계 더 내려갈 예정이면 true
  pending: boolean;
  // 보고 있는 달을 한 번도 빠짐없이 지켰으면 true(이스터에그: 맨 앞에 알파메일이 나타난다)
  perfect?: boolean;
};

// 이번 달 퇴화 단계. 지금 단계는 칸 배경으로 강조, 지나온 단계는 흐리게, 아직 안 간 단계는 아주 연하게.
export const EvolutionStrip = ({ failures, pending, perfect = false }: EvolutionStripProps) => {
  const current = perfect ? ALPHA_STAGE : stageIndexFor(failures);
  const next = !perfect && pending && current < LAST_STAGE ? current + 1 : null;
  // 그림을 누르면 그 단계 설명 카드를 화면 가운데에 띄운다(사용자 요청).
  const [info, setInfo] = useState<number | null>(null);
  const stages = perfect ? [ALPHA_STAGE, 0, 1, 2, 3, 4] : [0, 1, 2, 3, 4];
  const iconBoxHeight = perfect ? ROW_HEIGHT_PERFECT : ROW_HEIGHT_NORMAL;

  return (
    <View
      accessibilityLabel={
        perfect
          ? '이번 달 한 번도 빠짐없이 지켜서 알파메일이 됐어요'
          : `이번 달 못 지킨 날 ${failures}번, 지금 ${stageAt(current).label}. ${MAX_FAILURES}번이면 그 달 끝`
      }
    >
      <View style={styles.row}>
        {stages.map((stage, position) => {
          const isCurrent = stage === current;
          // 알파메일 달에는 나머지가 모두 "내려가지 않은" 단계라 흐리게 둔다.
          const passed = perfect ? !isCurrent : stage < current;
          const isNext = stage === next;
          const opacity = isCurrent ? 1 : passed ? 0.3 : isNext ? 0.45 : 1;
          return (
            <View key={stage} style={styles.cellWrap}>
              {position > 0 ? (
                <AppText variant="caption" color="textMuted" style={styles.arrow}>
                  ›
                </AppText>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${stageAt(stage).label} 설명 보기`}
                onPress={() => setInfo(stage)}
                style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
              >
                <View style={[styles.iconBox, { height: iconBoxHeight }]}>
                  <StageIcon
                    stage={stage}
                    imageSize={imageSizeForInkHeight(stage, STAGE_ICON_HEIGHT[stage] ?? ROW_HEIGHT_NORMAL)}
                    tint={isCurrent || passed || isNext ? 'ink' : 'line'}
                    opacity={opacity}
                  />
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
      <AppText variant="caption" color="textSecondary" style={styles.count}>
        {perfect
          ? '한 달 내내 빠짐없이 지켰어요 · 알파메일'
          : failures >= MAX_FAILURES
            ? `${MAX_FAILURES}번 못 지켜서 이번 달은 유인원으로 끝났어요`
            : `이번 달 못 지킨 날 ${failures}/${MAX_FAILURES}${next !== null ? ' · 오늘 못 지키면 한 단계 더' : ''}`}
      </AppText>
      <StageInfoModal stage={info} current={current} onClose={() => setInfo(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cellWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.6 },
  arrow: { width: 8, textAlign: 'center', marginLeft: -4, marginRight: -4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  // 그림은 아래(발)를 맞춰 세워서, 위로 갈수록 큰 그림이 높이 솟아 보이게 한다.
  iconBox: { justifyContent: 'flex-end' },
  count: { marginTop: 6 },
});
