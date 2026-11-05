import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  AppText,
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  Icon,
  TextField,
} from '@/components/ui';

import { DurationPicker } from './DurationPicker';
import { ImportanceSelect } from './ImportanceSelect';
import { ALL_DAYS, WEEKDAY_LABEL, WEEK_ORDER, describeDays, toggleDay } from '@/features/routines/types';

import type { TaskForm } from '../types';

type TaskSheetProps = {
  visible: boolean;
  // 시트를 열 때의 초기값. 새 할 일이면 기본값, 수정이면 기존 값.
  initial: TaskForm;
  isNew: boolean;
  onClose: () => void;
  onSave: (form: TaskForm) => void;
  // 있으면(이미 있는 할 일을 고칠 때) 저장 아래에 빨간 [삭제]를 보여 준다. 누르면 시트를 닫고 확인창을 띄운다.
  onDelete?: () => void;
  // 설정 화면의 반복 할 일 편집: 반복 요일 칸을 보여 주고, 요일을 꼭 골라야 저장된다.
  // 반복은 설정에서만 정한다(사용자 요청). 할 일 화면의 시트에는 반복 칸이 없다.
  requireDays?: boolean;
};

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

// 키보드 때문에 아래가 가려지지 않게 두 단계로 나눈다(사용자 요청).
// 1) 제목만 입력(키보드 위에 [다음]) → 2) 키보드를 내리고 중요도·시간·반복을 고른 뒤 [저장].
// 이미 있는 할 일을 고칠 때는 2단계부터 열고, 제목 옆 [수정]으로 1단계에 돌아간다.
type Step = 'title' | 'details';

// 2단계 내용이 길어도 화면 위쪽 여유를 남기고 스크롤된다.
const DETAILS_MAX_HEIGHT = Dimensions.get('window').height * 0.62;

export const TaskSheet = ({ visible, initial, isNew, onClose, onSave, onDelete, requireDays = false }: TaskSheetProps) => {
  const [draft, setDraft] = useState<TaskForm>(initial);
  const [step, setStep] = useState<Step>(isNew ? 'title' : 'details');

  useEffect(() => {
    if (!visible) return;
    setDraft(initial);
    setStep(isNew ? 'title' : 'details');
  }, [visible, initial, isNew]);

  // 시트가 열리면 바로 키보드가 뜨게 한다(사용자 요청). autoFocus만으로는 안드로이드의 Modal 안에서
  // 키보드가 안 뜨는 경우가 있어서, 시트가 올라온 뒤 한 번 더 포커스를 준다.
  const titleRef = useRef<TextInputInstance>(null);
  useEffect(() => {
    if (!visible || step !== 'title') return;
    const ids = [80, 320].map((ms) => setTimeout(() => titleRef.current?.focus(), ms));
    return () => ids.forEach(clearTimeout);
  }, [visible, step]);

  const hasTitle = draft.title.trim().length > 0;
  const canSave = hasTitle && (!requireDays || draft.days.length > 0);
  const everyDay = draft.days.length === ALL_DAYS.length;

  const toDetails = () => {
    if (!hasTitle) return;
    Keyboard.dismiss();
    setStep('details');
  };

  if (step === 'title') {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <AppText variant="label">무엇을 할까요?</AppText>
        <View style={styles.titleField}>
          <TextField
            value={draft.title}
            onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))}
            placeholder="할 일을 입력하세요"
            size="large"
            inputRef={titleRef}
            autoFocus
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={toDetails}
            trailing={
              hasTitle ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="입력 지우기"
                  hitSlop={HIT_SLOP}
                  onPress={() => setDraft((prev) => ({ ...prev, title: '' }))}
                >
                  <Icon name="close" size={11} color="ink" />
                </Pressable>
              ) : null
            }
          />
        </View>
        <Button label="다음" disabled={!hasTitle} onPress={toDetails} style={styles.next} />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.titleRow}>
        <AppText variant="heading" numberOfLines={1} style={styles.titleText}>
          {draft.title}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="할 일 이름 고치기"
          hitSlop={HIT_SLOP}
          onPress={() => setStep('title')}
          style={styles.editTitle}
        >
          <AppText variant="subtitle" color="textSecondary">
            이름 수정
          </AppText>
        </Pressable>
      </View>

      <ScrollView style={styles.details} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <AppText variant="caption" color="textTertiary" style={styles.sectionLabel}>
        중요도
      </AppText>
      <ImportanceSelect value={draft.importance} onChange={(importance) => setDraft((prev) => ({ ...prev, importance }))} />
      <View style={styles.durationCard}>
        <AppText variant="caption" color="textTertiary">
          예상 소요 시간
        </AppText>
        <DurationPicker minutes={draft.minutes} onChange={(minutes) => setDraft((prev) => ({ ...prev, minutes }))} />
      </View>

      {requireDays ? (
      <>
      <View style={styles.repeatHeader}>
        <AppText variant="label">반복</AppText>
        <AppText variant="subtitle" color="textSecondary">
          {draft.days.length === 0 ? '반복 안 함' : describeDays(draft.days)}
        </AppText>
      </View>
      <View style={styles.chips}>
        <ChipGroup gap={5}>
          <Chip
            compact
            width="fill"
            label="매일"
            selected={everyDay}
            onPress={() => setDraft((prev) => ({ ...prev, days: everyDay ? [] : [...ALL_DAYS] }))}
          />
          {WEEK_ORDER.map((day) => (
            <Chip
              key={day}
              compact
              width="fill"
              label={WEEKDAY_LABEL[day] ?? ''}
              selected={draft.days.includes(day)}
              onPress={() => setDraft((prev) => ({ ...prev, days: toggleDay(prev.days, day) }))}
            />
          ))}
        </ChipGroup>
      </View>

      {draft.days.length === 0 ? (
        <AppText variant="caption" color="textSecondary" style={styles.needDays}>
          반복할 요일을 골라 주세요
        </AppText>
      ) : null}
      </>
      ) : null}
      </ScrollView>

      <Button label="저장" disabled={!canSave} onPress={() => onSave({ ...draft, title: draft.title.trim() })} style={styles.save} />
      {onDelete !== undefined ? (
        <Pressable accessibilityRole="button" accessibilityLabel="삭제" onPress={onDelete} hitSlop={HIT_SLOP} style={styles.delete}>
          <AppText variant="subtitle" color="danger">
            삭제
          </AppText>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  titleField: { marginTop: 12 },
  next: { marginTop: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 36 },
  titleText: { flex: 1 },
  editTitle: { paddingVertical: 6 },
  details: { maxHeight: DETAILS_MAX_HEIGHT, marginTop: 4 },
  needDays: { marginTop: 8 },
  sectionLabel: { marginTop: 16, marginBottom: 2 },
  chips: { marginTop: 9 },
  durationCard: { marginTop: 18 },
  repeatHeader: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  save: { marginTop: 18 },
  delete: { alignSelf: 'center', marginTop: 12, paddingVertical: 6, paddingHorizontal: 20 },
});
