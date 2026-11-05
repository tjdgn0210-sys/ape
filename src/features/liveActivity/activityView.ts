import { resolveNow } from '@/features/schedule/resolveNow';
import type { Plan, PlanItem } from '@/features/schedule/types';
import { formatClock } from '@/lib/time';

// 잠금화면에 보여 줄 내용. endAtMs가 있으면 그 시각까지 남은 시간이 (앱이 꺼져 있어도) 저절로 줄어든다.
export type ActivityView = {
  title: string;
  subtitle: string;
  endAtMs: number | null;
  // 오늘 일정이 모두 끝나서 잠금화면 표시를 마무리해야 하는 상태
  final: boolean;
  // 내용이 바뀌었는지 비교하는 값(시각이 흘러도 같은 상태면 같다)
  key: string;
};

const labelOf = (item: PlanItem) => (item.kind === 'task' ? item.title : '휴식');

const minutesOf = (item: PlanItem) => item.endMin - item.startMin;

// "다음 15:00 휴식 · 15분"
const nextLabel = (items: readonly PlanItem[], afterMin: number): string | null => {
  const next = items.find((item) => item.startMin >= afterMin);
  if (next === undefined) return null;
  return `다음 ${formatClock(next.startMin)} ${labelOf(next)} · ${minutesOf(next)}분`;
};

const join = (...parts: (string | null)[]) => parts.filter((part): part is string => part !== null).join('  ');

// 지금 계획표 상태를 잠금화면 내용으로 바꾼다(앱 안 카드와 같은 상태 구분, resolveNow 기준).
// 오늘 계획표가 없으면 null.
export const activityViewFor = (plan: Plan | null, nowSec: number, nowMs: number, todayKey: string): ActivityView | null => {
  if (plan === null || plan.dateKey !== todayKey) return null;

  const state = resolveNow(plan.items, new Set(plan.completedTaskIds), nowSec, new Set(Object.keys(plan.lateStartedAt ?? {})));
  const at = (sec: number) => nowMs + (sec - nowSec) * 1000;
  const make = (title: string, subtitle: string, endSec: number | null): ActivityView => ({
    title,
    subtitle,
    endAtMs: endSec === null ? null : at(endSec),
    final: endSec === null,
    key: `${title}|${subtitle}|${endSec ?? 'end'}`,
  });
  const range = (startMin: number, endMin: number) => `${formatClock(startMin)} - ${formatClock(endMin)}`;

  switch (state.kind) {
    case 'task': {
      const when = join(range(state.item.startMin, state.item.endMin), nextLabel(plan.items, state.item.endMin) ?? '마지막 일정');
      // 시작 시각부터 5분: 마감까지 줄어드는 시간(사용자 요청: 시작만 돕는 앱)
      if (state.status === 'pending') return make(state.item.title, `시작 버튼을 눌러 주세요  ${range(state.item.startMin, state.item.endMin)}`, state.deadlineSec);
      if (state.status === 'missed') return make(`${state.item.title} · 시작 못 했어요`, when, state.endSec);
      if (state.status === 'late') return make(`${state.item.title} · 늦게 시작`, when, state.endSec);
      return make(state.item.title, when, state.endSec);
    }
    case 'break':
      return make(
        '휴식',
        join(range(state.item.startMin, state.item.endMin), nextLabel(plan.items, state.item.endMin) ?? '마지막 일정'),
        state.endSec,
      );
    case 'before':
      return make(
        `${formatClock(state.item.startMin)} ${labelOf(state.item)}`,
        `시작까지 · ${minutesOf(state.item)}분`,
        state.endSec,
      );
    case 'finished':
      return make('오늘 일정 끝', `시작 ${state.done}/${state.total}`, null);
  }
};

export type ActivityAction = 'none' | 'start' | 'update' | 'stop';

// 이미 떠 있는 잠금화면 표시(prev)와 지금 보여 줄 내용(view)을 비교해 무엇을 할지 정한다.
export const nextActivityAction = (prevKey: string | null, hasActivity: boolean, view: ActivityView | null): ActivityAction => {
  if (view === null || view.final) return hasActivity ? 'stop' : 'none';
  if (!hasActivity) return 'start';
  return prevKey === view.key ? 'none' : 'update';
};
