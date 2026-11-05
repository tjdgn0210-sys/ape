import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  AppText,
  Button,
  Card,
  Checkbox,
  Chip,
  ChipGroup,
  Divider,
  Icon,
  Screen,
  TextField,
} from '@/components/ui';
import type { TypographyVariant } from '@/theme';

const TYPE_SAMPLES: ReadonlyArray<{ variant: TypographyVariant; text: string }> = [
  { variant: 'display', text: '오늘의 계획' },
  { variant: 'headline', text: '오늘의 계획표' },
  { variant: 'heading', text: '2026년 10월' },
  { variant: 'label', text: '중요도' },
  { variant: 'body', text: '영어 공부' },
  { variant: 'subtitle', text: '오늘 할 일을 적으세요. 시간이 되면 시작만 누르면 돼요.' },
  { variant: 'caption', text: '15분' },
  { variant: 'numberLarge', text: '42:18' },
  { variant: 'numberSmall', text: '01 02 03' },
];

type SectionProps = { title: string; children: React.ReactNode };

const Section = ({ title, children }: SectionProps) => (
  <View style={styles.section}>
    <AppText variant="caption" color="textMuted">
      {title}
    </AppText>
    {children}
  </View>
);

// 1단계 확인용 공통 컴포넌트 갤러리. 2단계부터 실제 화면으로 교체한다.
const ComponentGallery = () => {
  const [importance, setImportance] = useState<'높음' | '보통' | '낮음'>('높음');
  const [range, setRange] = useState<'지금부터' | '오후' | '저녁' | '하루 종일'>('지금부터');
  const [checked, setChecked] = useState(true);
  const [text, setText] = useState('');

  return (
    <Screen scroll>
      <AppHeader />

      <Section title="TEXT">
        {TYPE_SAMPLES.map(({ variant, text: sample }) => (
          <AppText key={variant} variant={variant}>
            {sample}
          </AppText>
        ))}
      </Section>

      <Section title="TEXT FIELD">
        <TextField
          placeholder="할 일을 입력하세요"
          value={text}
          onChangeText={setText}
          trailing={
            <Pressable accessibilityLabel="추가" hitSlop={12}>
              <Icon name="plus" size={12} color="ink" />
            </Pressable>
          }
        />
      </Section>

      <Section title="CHIP — fill">
        <ChipGroup>
          {(['높음', '보통', '낮음'] as const).map((label) => (
            <Chip
              key={label}
              label={label}
              width="fill"
              selected={importance === label}
              onPress={() => setImportance(label)}
            />
          ))}
        </ChipGroup>
      </Section>

      <Section title="CHIP — auto">
        <ChipGroup>
          {(['지금부터', '오후', '저녁', '하루 종일'] as const).map((label) => (
            <Chip key={label} label={label} selected={range === label} onPress={() => setRange(label)} />
          ))}
        </ChipGroup>
      </Section>

      <Section title="CARD">
        <Card>
          <AppText variant="body">예상 소요 시간</AppText>
        </Card>
        <Card tone="dark">
          <AppText variant="heading" color="onCard">
            영어 공부
          </AppText>
          <AppText variant="subtitle" color="onCardMuted">
            14:00 - 15:00
          </AppText>
        </Card>
      </Section>

      <Section title="CHECKBOX / DIVIDER">
        <View style={styles.row}>
          <Checkbox checked={checked} onPress={() => setChecked((v) => !v)} accessibilityLabel="영어 공부" />
          <Checkbox checked={false} />
        </View>
        <Divider />
      </Section>

      <Section title="ICON">
        <View style={styles.row}>
          {(['calendar', 'gear', 'plus', 'close', 'chevronRight'] as const).map((name) => (
            <Icon key={name} name={name} size={24} />
          ))}
        </View>
      </Section>

      <Section title="BUTTON">
        <Button label="확인" />
        <View style={styles.row}>
          <Button label="이전" variant="secondary" style={styles.flex} />
          <Button label="시작하기" style={styles.flex} />
        </View>
        <Button label="비활성" disabled />
      </Section>
    </Screen>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 32, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1 },
});

export default ComponentGallery;
