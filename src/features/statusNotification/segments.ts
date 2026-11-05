import { activityViewFor } from '@/features/liveActivity/activityView';
import { deadlineOf } from '@/features/schedule/resolveNow';
import type { Plan } from '@/features/schedule/types';

// 상단바(알림) 진행 표시 한 구간: startMs부터 untilMs까지 같은 내용을 보여 준다.
// endAtMs = 남은 시간이 0이 되는 시각(알림의 거꾸로 가는 시계).
export type StatusSegment = {
  startMs: number;
  untilMs: number;
  title: string;
  body: string;
  endAtMs: number;
};

// 지금부터 오늘 일정이 끝날 때까지를 구간으로 나눈다. 각 일정의 시작·끝 시각과 할 일의 시작 마감(5분 뒤)이 경계다.
// 내용은 잠금화면(Live Activity)과 같은 규칙(activityViewFor)으로 만든다: 제목 = 지금 일정, 본문 = 시간·다음 일정.
// 앱이 꺼져 있어도 구간이 바뀔 때마다 다음 알림이 저절로 뜨도록, 미리 전부 계산해 예약한다.
export const statusSegmentsFor = (plan: Plan | null, now: Date, todayKey: string): StatusSegment[] => {
  if (plan === null || plan.dateKey !== todayKey) return [];
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const dayStartMs = midnight.getTime();
  const nowMs = now.getTime();
  const nowSec = Math.floor((nowMs - dayStartMs) / 1000);

  const boundaries = Array.from(new Set(plan.items.flatMap((item) => [item.startMin * 60, item.endMin * 60, ...(item.kind === 'task' ? [deadlineOf(item)] : [])])))
    .filter((sec) => sec > nowSec)
    .sort((a, b) => a - b);
  const starts = [nowSec, ...boundaries];

  const segments: StatusSegment[] = [];
  starts.forEach((sec, index) => {
    const next = starts[index + 1];
    // 경계 바로 안쪽(+1초)의 상태로 내용을 정한다.
    const probe = sec === nowSec ? nowSec : sec + 1;
    const view = activityViewFor(plan, probe, dayStartMs + probe * 1000, todayKey);
    if (view === null || view.final || view.endAtMs === null) return;
    const startMs = dayStartMs + sec * 1000;
    const untilMs = next === undefined ? view.endAtMs : dayStartMs + next * 1000;
    if (untilMs <= startMs) return;
    const last = segments[segments.length - 1];
    // 내용이 같으면 앞 구간을 늘린다.
    if (last !== undefined && last.title === view.title && last.body === view.subtitle && last.endAtMs === view.endAtMs) {
      last.untilMs = untilMs;
      return;
    }
    segments.push({ startMs, untilMs, title: view.title, body: view.subtitle, endAtMs: view.endAtMs });
  });
  return segments;
};
