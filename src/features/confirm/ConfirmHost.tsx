import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { StageIcon } from '@/features/history/components/StageIcon';
import { LAST_STAGE } from '@/features/history/evolution';
import { imageSizeForInkHeight } from '@/features/history/stages';
import { radii, useColors } from '@/theme';

import { useConfirmStore, type ConfirmButton, type ConfirmRequest } from './confirmStore';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const ICON_HEIGHT = 26;

// 루트 레이아웃에 하나만 둔다. 흰 카드 + 위에 작은 유인원 + 제목·설명 + 앱 버튼(회색 취소 / 검은 확인).
// 버튼이 2개면 나란히, 3개 이상이면 위아래로 쌓는다(취소는 맨 아래).
export const ConfirmHost = () => {
  const request = useConfirmStore((state) => state.request);
  const close = useConfirmStore((state) => state.close);
  const colors = useColors();
  // 닫히는 동안에도 내용이 보이도록 마지막 요청을 들고 있는다.
  const [shown, setShown] = useState<ConfirmRequest | null>(request);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (request !== null) {
      setShown(request);
      appear.setValue(0);
      Animated.timing(appear, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
      return;
    }
    Animated.timing(appear, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }).start(
      ({ finished }) => {
        if (finished) setShown(null);
      },
    );
  }, [request, appear]);

  if (shown === null) return null;

  const press = (button: ConfirmButton) => {
    close();
    button.onPress?.();
  };
  const cancel = shown.buttons.find((button) => button.style === 'cancel');
  const actions = shown.buttons.filter((button) => button.style !== 'cancel');
  const stacked = shown.buttons.length > 2;
  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => (cancel !== undefined ? press(cancel) : close())}>
      <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: appear }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="닫기" onPress={() => cancel !== undefined && press(cancel)} />
        <Animated.View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.background, transform: [{ scale }] }]}
        >
          <StageIcon stage={LAST_STAGE} imageSize={imageSizeForInkHeight(LAST_STAGE, ICON_HEIGHT)} />
          <AppText variant="heading" style={styles.title}>
            {shown.title}
          </AppText>
          {shown.message !== undefined && shown.message.length > 0 ? (
            <AppText variant="subtitle" color="textSecondary" style={styles.message}>
              {shown.message}
            </AppText>
          ) : null}

          <View style={[styles.buttons, stacked ? styles.stacked : styles.row]}>
            {stacked ? null : cancel !== undefined ? (
              <Button label={cancel.text} variant="secondary" onPress={() => press(cancel)} style={styles.flex} />
            ) : null}
            {actions.map((button) => (
              <Button
                key={button.text}
                label={button.text}
                // 되묻는 창의 확인 버튼은 모두 검은 버튼(사용자 요청: 빨강 말고 검정)
                variant={stacked && button !== actions[actions.length - 1] ? 'secondary' : 'primary'}
                onPress={() => press(button)}
                style={stacked ? undefined : styles.flex}
              />
            ))}
            {stacked && cancel !== undefined ? (
              <Pressable accessibilityRole="button" onPress={() => press(cancel)} style={styles.textCancel}>
                <AppText variant="subtitle" color="textSecondary">
                  {cancel.text}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { borderRadius: radii.card, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20 },
  title: { marginTop: 14 },
  message: { marginTop: 6 },
  buttons: { marginTop: 22, gap: 10 },
  row: { flexDirection: 'row' },
  stacked: { flexDirection: 'column' },
  flex: { flex: 1 },
  textCancel: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
});
