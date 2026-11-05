export type Importance = 'high' | 'medium' | 'low';

export type TaskDraft = {
  title: string;
  importance: Importance;
  minutes: number;
};

export type Task = TaskDraft & {
  id: string;
  // 반복 할 일에서 만들어진 할 일이면 그 반복 규칙의 id
  routineId?: string;
};

// 할 일 시트에서 편집하는 값. days는 반복 요일(0=일 … 6=토), 비어 있으면 반복 없음.
export type TaskForm = TaskDraft & { days: number[] };

export const IMPORTANCE_ORDER: readonly Importance[] = ['high', 'medium', 'low'];

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

// 중요도를 고르면 칩 아래에 보여 주는 설명. 시간표에서 실제로 하는 일과 같아야 한다(buildSchedule 참고).
export const IMPORTANCE_HINT: Record<Importance, string> = {
  high: '오늘 꼭 시작해야 하는 일이에요. 가장 먼저 배치되고, 시간이 모자라도 끝까지 남아요.',
  medium: '하면 좋은 일이에요. 높음 다음에 배치돼요.',
  low: '못 해도 괜찮은 일이에요. 가장 나중에 배치되고, 시간이 모자라면 먼저 빠져요.',
};

// 예상 소요 시간은 칩에서 고른다(분). 칩 값은 임의로 정했다(Estimate). 예전 슬라이더로 저장한 5분 단위 값이 있으면 그 값도 칩에 같이 보인다.
export const DURATION_OPTIONS: readonly number[] = [10, 15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180];
export const DURATION_INITIAL = 30;
export const DURATION_PER_ROW = 4;

// 현재 값이 칩에 없으면 끼워 넣어서(오름차순) 항상 선택된 칩이 보이게 한다.
export const durationOptionsFor = (current: number): number[] =>
  [...new Set([...DURATION_OPTIONS, current])].sort((a, b) => a - b);

export const DEFAULT_DRAFT: TaskDraft = {
  title: '',
  importance: 'medium',
  minutes: DURATION_INITIAL,
};

export const DEFAULT_FORM: TaskForm = { ...DEFAULT_DRAFT, days: [] };
