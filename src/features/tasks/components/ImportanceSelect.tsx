import { SegmentedControl } from '@/components/ui';

import { IMPORTANCE_LABEL, IMPORTANCE_ORDER, type Importance } from '../types';

// 중요도 고르기: 글자가 보이는 3칸 구간 선택. 고른 칸은 검게 채워져 지금 값이 분명하다.
// (QuickOptions와 할 일 시트가 같이 쓴다.)
type ImportanceSelectProps = {
  value: Importance;
  onChange: (value: Importance) => void;
};

const OPTIONS = IMPORTANCE_ORDER.map((level) => ({
  value: level,
  label: IMPORTANCE_LABEL[level],
  accessibilityLabel: `중요도 ${IMPORTANCE_LABEL[level]}`,
}));

export const ImportanceSelect = ({ value, onChange }: ImportanceSelectProps) => (
  <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />
);
