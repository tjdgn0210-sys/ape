import type { Importance } from '@/features/tasks/types';

export type BreakMode = 'auto' | 'manual';
export type ScheduleStyle = 'focus' | 'balanced' | 'relaxed';

// 쉬는 시간 설정(마지막에 쓴 값을 저장해 두고 3단계의 처음 값과 밀린 일 재배치에 쓴다).
export type BreakPrefs = {
  breakMode: BreakMode;
  manualBreakMin: number;
  style: ScheduleStyle;
};

// 1단계(오늘 쓸 수 있는 시간)에서 정한 시작·종료. 2·3단계가 이어서 쓴다.
export type TimeDraft = {
  startMin: number;
  endMin: number;
};

export type PlanTaskItem = {
  kind: 'task';
  taskId: string;
  title: string;
  importance: Importance;
  startMin: number;
  endMin: number;
};

export type PlanBreakItem = {
  kind: 'break';
  startMin: number;
  endMin: number;
};

export type PlanItem = PlanTaskItem | PlanBreakItem;

export type Plan = {
  dateKey: string;
  items: PlanItem[];
  // 시간이 모자라 배치하지 못한 할 일 제목
  excludedTitles: string[];
  // 제때 시작한(= 성공한) 할 일 id. 이름은 예전 "완료" 때문에 그대로 두었다.
  completedTaskIds: string[];
  // 시작 버튼을 누른 시각(하루 중 초). "14:03 시작 · 3분 늦게"에 쓴다.
  startedAt?: Record<string, number>;
  // 5분이 지난 뒤 [늦었어도 시작]을 누른 시각(하루 중 초). 성공으로 치지 않고(실패 그대로) 기록만 남긴다.
  lateStartedAt?: Record<string, number>;
};

// 일정 시작 시각부터 이만큼(초) 안에 [시작]을 눌러야 성공이다. 지나면 그 할 일은 실패(사용자 요청: 5분).
export const START_GRACE_SEC = 5 * 60;

export const STYLE_LABEL: Record<ScheduleStyle, string> = {
  // 사용자 요청: 3단계에서 "빠르게 / 보통 / 여유"로 고른다(예전 이름 집중·균형).
  focus: '빠르게',
  balanced: '보통',
  relaxed: '여유',
};

export const BREAK_MODE_HINT: Record<BreakMode, string> = {
  auto: '일정 양에 맞춰 사이마다 알아서 정해요. 앞 일이 길수록 길게, 시간이 빠듯하면 짧게(최소 5분) 잡고, 일정 스타일이 반영돼요.',
  manual: '모든 일 사이에 같은 길이로 넣어요. −, + 버튼으로 0~60분까지 5분 단위로 정해요. 일정 스타일은 반영되지 않아요.',
};

export const STYLE_HINT: Record<ScheduleStyle, string> = {
  focus: '쉬는 시간을 짧게 잡고 일찍 끝내요',
  balanced: '남는 시간을 적당히 나눠 쉬어요',
  relaxed: '정한 종료 시각까지 넉넉히 쉬어요',
};

export const STYLE_ORDER: readonly ScheduleStyle[] = ['focus', 'balanced', 'relaxed'];

export const MANUAL_BREAK = { min: 0, max: 60, step: 5 } as const;
