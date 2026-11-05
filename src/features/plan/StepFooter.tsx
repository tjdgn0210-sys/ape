import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';

type StepFooterProps = {
  onNext: () => void;
  // 있으면 [다음] 왼쪽에 회색 [이전] 버튼(시간·할 일을 잘못 정했을 때 돌아간다)
  onPrev?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
};

// 화면 맨 아래: 회색 [이전] + 검은 큰 [다음].
export const StepFooter = ({ onNext, onPrev, nextLabel = '다음', nextDisabled = false }: StepFooterProps) => (
  <View style={styles.root}>
    {onPrev !== undefined ? <Button variant="gray" label="이전" onPress={onPrev} style={styles.prev} /> : null}
    <Button label={nextLabel} onPress={onNext} disabled={nextDisabled} style={styles.next} />
  </View>
);

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: 10, paddingTop: 8 },
  prev: { width: 104 },
  next: { flex: 1 },
});
