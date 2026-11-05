import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, useColors } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  // 화면 맨 아래에 좌우 여백 없이 붙는 영역(하단 탭). 있으면 홈 인디케이터 여백은 그쪽이 맡는다.
  bottomBar?: ReactNode;
};

export const Screen = ({ children, scroll = false, style, bottomBar }: ScreenProps) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const padding = {
    paddingTop: insets.top,
    // 디자인: 하단 버튼 아래 여백 = 홈 인디케이터 영역 + 9pt. 하단 탭이 있으면 탭 위로 12pt.
    paddingBottom: bottomBar === undefined ? Math.max(insets.bottom + 9, 16) : 12,
  };

  const body = scroll ? (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, padding, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.root, styles.content, { backgroundColor: colors.background }, padding, style]}>{children}</View>
  );

  // 아이폰은 키보드가 올라와도 화면이 자동으로 줄지 않아서(안드로이드와 다름) 키보드 높이만큼 화면을 밀어 올린다. 그래야 [취소][확인]·[다음]이 가려지지 않는다.
  const avoid = (content: ReactNode) =>
    Platform.OS === 'ios' ? (
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        {content}
      </KeyboardAvoidingView>
    ) : (
      content
    );

  if (bottomBar === undefined) return avoid(body);
  return avoid(
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {body}
      {bottomBar}
    </View>,
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.screenMargin },
});
