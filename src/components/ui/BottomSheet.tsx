import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, useColors } from '@/theme';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const DURATION_MS = 220;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export const BottomSheet = ({ visible, onClose, children }: BottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const progress = useRef(new Animated.Value(0)).current;
  // 닫는 애니메이션이 끝날 때까지 Modal을 유지한다.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION_MS,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: DURATION_MS,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get('window').height, 0],
  });

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      {/* 키보드가 올라오면 시트를 키보드 위로 올린다(안드로이드도 같이. 전에는 iOS만이라 안드로이드에서 키보드가 시트를 가렸다). */}
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]}>
          <Pressable
            accessibilityLabel="닫기"
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            // 디자인: 버튼 아래 여백 = 홈 인디케이터 영역 + 9pt
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom + 9, 16),
              transform: [{ translateY }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    // 넓은 화면에서는 시트도 앱 폭으로 가운데에 둔다.
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: 17,
    paddingHorizontal: 24,
  },
});
