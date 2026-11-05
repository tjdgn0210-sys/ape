import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './iconPaths';

export type TabItem = {
  key: string;
  label: string;
  icon: IconName;
  // 아이콘마다 디자인 크기가 달라서 따로 받는다.
  iconSize: number;
  onPress: () => void;
};

type BottomTabsProps = {
  tabs: readonly TabItem[];
  activeKey: string;
};

export const BottomTabs = ({ tabs, activeKey }: BottomTabsProps) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: insets.bottom, backgroundColor: colors.background },
      ]}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={tab.onPress}
            style={styles.tab}
          >
            <View style={styles.iconSlot}>
              <Icon name={tab.icon} size={tab.iconSize} color={active ? 'ink' : 'textMuted'} />
            </View>
            <AppText variant="caption" color={active ? 'ink' : 'textMuted'} style={styles.label}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // 디자인: 위쪽 구분선 y=761, 아이콘 중심 y≈781, 글자 중심 y≈807(홈 인디케이터 영역 34 포함 높이 91).
  root: {
    flexDirection: 'row',
    paddingHorizontal: 17,
  },
  tab: { flex: 1, height: 57, alignItems: 'center' },
  iconSlot: { marginTop: 8, height: 22, justifyContent: 'center' },
  label: { marginTop: 5 },
});
