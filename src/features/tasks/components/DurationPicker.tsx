import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { AppText, Chip, ChipGroup } from '@/components/ui';
import { formatDuration } from '@/lib/time';
import { scaledTypography, useColors, useFontScale } from '@/theme';

// 예상 소요 시간 고르기(사용자 요청: 휠 두 개가 불편해서 깔끔하게).
// 가운데 큰 글자("1시간 30분") 양옆 [−][+]로 5분씩, 아래 자주 쓰는 시간 칩으로 한 번에.
// 가운데 글자를 누르면 분을 숫자 키보드로 직접 입력한다.
export const MAX_DURATION = 12 * 60;
const MIN_DURATION = 5;
const STEP = 5;
const PRESETS = [
  [15, 30, 45],
  [60, 90, 120],
] as const;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

const clampMinutes = (value: number) => Math.min(MAX_DURATION, Math.max(MIN_DURATION, value));

type DurationPickerProps = { minutes: number; onChange: (minutes: number) => void };

export const DurationPicker = ({ minutes, onChange }: DurationPickerProps) => {
  const colors = useColors();
  const scale = useFontScale();
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState(String(minutes));
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (!typing) setText(String(minutes));
  }, [minutes, typing]);

  useEffect(() => {
    if (!typing) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [typing]);

  const commit = () => {
    const value = clampMinutes(Number.parseInt(text, 10) || minutes);
    setTyping(false);
    setText(String(value));
    if (value !== minutes) onChange(value);
  };

  // 5분 단위로 맞춰 움직인다(7분에서 +는 10분).
  const step = (direction: 1 | -1) => {
    const snapped = direction > 0 ? Math.floor(minutes / STEP) * STEP + STEP : Math.ceil(minutes / STEP) * STEP - STEP;
    onChange(clampMinutes(snapped));
  };

  const stepButton = (direction: 1 | -1) => {
    const disabled = direction < 0 ? minutes <= MIN_DURATION : minutes >= MAX_DURATION;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={direction < 0 ? '5분 줄이기' : '5분 늘리기'}
        disabled={disabled}
        hitSlop={HIT_SLOP}
        onPress={() => step(direction)}
        style={({ pressed }) => [
          styles.stepButton,
          { backgroundColor: colors.background, borderColor: colors.line, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
        ]}
      >
        <AppText variant="heading" color="ink">
          {direction < 0 ? '−' : '+'}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View>
      <View style={styles.valueRow}>
        {stepButton(-1)}
        {typing ? (
          <View style={styles.center}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={(value) => setText(value.replace(/[^0-9]/g, '').slice(0, 3))}
                onBlur={commit}
                onSubmitEditing={commit}
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxFontSizeMultiplier={1.2}
                accessibilityLabel="예상 소요 시간(분) 직접 입력"
                style={[styles.input, scaledTypography('heading', scale), { color: colors.ink, borderBottomColor: colors.ink }]}
              />
              <AppText variant="heading" color="textTertiary">
                분
              </AppText>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`예상 소요 시간 ${formatDuration(minutes)}, 눌러서 직접 입력`}
            onPress={() => setTyping(true)}
            style={styles.center}
          >
            <AppText variant="heading" color="ink" numberOfLines={1}>
              {formatDuration(minutes)}
            </AppText>
            <AppText variant="caption" color="textTertiary" style={styles.tapHint}>
              눌러서 직접 입력
            </AppText>
          </Pressable>
        )}
        {stepButton(1)}
      </View>

      <View style={styles.presets}>
        {PRESETS.map((row) => (
          <ChipGroup key={row.join('-')} gap={6}>
            {row.map((value) => (
              <Chip
                key={value}
                compact
                onCard
                width="fill"
                label={formatDuration(value)}
                selected={minutes === value}
                onPress={() => {
                  setTyping(false);
                  onChange(value);
                }}
              />
            ))}
          </ChipGroup>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  valueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  stepButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  tapHint: { marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { minWidth: 64, textAlign: 'center', padding: 0, borderBottomWidth: 2, outlineWidth: 0 },
  presets: { marginTop: 14, gap: 6 },
});
