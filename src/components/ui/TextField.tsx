import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { layout, scaledTypography, useColors, useFontScale } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  // 오른쪽 끝 슬롯. 보통 + 또는 × 아이콘 버튼을 넣는다.
  trailing?: ReactNode;
  // large: 시트 안의 제목 입력(글자가 더 크다).
  size?: 'default' | 'large';
  // 코드에서 포커스를 줄 때(시트가 열린 뒤 키보드 띄우기)
  inputRef?: Ref<TextInputInstance>;
};

// 진한 테두리 상자 안에 큰 글자로 쓰는 입력 칸(사용자 요청: 입력 칸이 안 보임). 오른쪽 + 버튼이 함께 보인다.
// 안내 글자(placeholder)는 입력 글자 크기의 절반으로, 칸 안에서 위아래 여백이 같게(세로 가운데) 직접 그린다(사용자 요청).
// (TextInput의 placeholder는 입력 글자와 같은 크기로만 나와서, 비어 있을 때만 위에 따로 얹는다.)
export const TextField = ({ trailing, size = 'default', inputRef, placeholder, ...inputProps }: TextFieldProps) => {
  const colors = useColors();
  const scale = useFontScale();
  const typography = scaledTypography(size === 'large' ? 'heading' : 'title', scale);
  const empty = (inputProps.value ?? '').length === 0;

  return (
    <View style={[styles.root, { borderColor: colors.ink }]}>
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          selectionColor={colors.ink}
          maxFontSizeMultiplier={1.2}
          accessibilityLabel={placeholder}
          {...inputProps}
          style={[styles.input, { color: colors.ink }, typography]}
        />
        {empty && placeholder !== undefined ? (
          <View pointerEvents="none" style={styles.placeholderBox}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={{ color: colors.textMuted, fontFamily: typography.fontFamily, fontSize: typography.fontSize * 0.5, lineHeight: typography.lineHeight * 0.5 }}
            >
              {placeholder}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    height: layout.inputHeight,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrap: { flex: 1, minWidth: 0, height: '100%', justifyContent: 'center' },
  input: {
    // 웹에서 input의 기본 최소 폭 때문에 오른쪽 버튼이 밀려나는 것을 막는다.
    minWidth: 0,
    outlineWidth: 0,
    height: '100%',
    padding: 0,
  },
  // 위·아래 여백이 같도록 칸 전체를 채우고 세로 가운데에 둔다.
  placeholderBox: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center' },
});
