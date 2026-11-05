import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';

type ExcludedNoticeProps = {
  // 계획에 못 넣은 할 일. meta는 오른쪽 작은 글자(중요도·시간), 없으면 제목만.
  items: readonly { title: string; meta?: string }[];
  // 아직 시작 전(3단계 화면)이면 "들어가지 않아요", 계획표에서는 "들어가지 않았어요"
  started: boolean;
};

// 쓸 수 있는 시간이 모자라 계획에서 뺀 할 일 안내. 상자 없이 글자만(리디자인).
export const ExcludedNotice = ({ items, started }: ExcludedNoticeProps) => {
  if (items.length === 0) return null;
  return (
    <View>
      <AppText variant="body">{`계획에 들어가지 ${started ? '않았어요' : '않아요'} · ${items.length}개`}</AppText>
      <AppText variant="caption" color="textTertiary" style={styles.reason}>
        시간이 모자라 중요도가 낮은 일부터 뺐어요
      </AppText>
      {items.map((item) => (
        <View key={item.title} style={styles.row}>
          <AppText variant="subtitle" color="textSecondary" numberOfLines={1} style={styles.title}>
            {item.title}
          </AppText>
          {item.meta !== undefined ? (
            <AppText variant="caption" color="textMuted">
              {item.meta}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  reason: { marginTop: 2, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  title: { flexShrink: 1 },
});
