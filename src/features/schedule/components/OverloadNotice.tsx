import { StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';

import type { Overload } from '../timeFit';

type OverloadNoticeProps = {
  overload: Overload;
};

// 시간 안에는 들어가지만 계획이 빽빽할 때 가볍게 알려 준다(막지는 않는다). 상자 없이 연한 [경고] + 한 줄.
export const OverloadNotice = ({ overload }: OverloadNoticeProps) => {
  const value = overload.kind === 'many' ? `할 일 ${overload.count}개 · 많아요` : `시간 ${overload.percent}% 사용 · 빽빽해요`;
  const label =
    overload.kind === 'many'
      ? `할 일이 ${overload.count}개예요. 많이 잡으면 하나라도 놓치기 쉬워요. 오늘 꼭 할 일 3~4개만 남겨 보세요.`
      : `쓸 수 있는 시간의 ${overload.percent}%를 써요. 쉬는 시간이 아주 짧아져요.`;

  return (
    <View accessibilityLabel={label} style={styles.box}>
      <Icon name="warning" size={18} color="textTertiary" />
      <AppText variant="subtitle" color="textTertiary">
        {value}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
