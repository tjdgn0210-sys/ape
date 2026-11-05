import { useDraftStore } from '@/features/schedule/draftStore';
import { useNow } from '@/features/schedule/useNow';
import { minuteOfDayOf } from '@/lib/time';

// 1단계에서 정한 시간을 2·3단계가 같은 방식으로 읽는다.
// 시작은 지금보다 이를 수 없다(항상 max(고른 값, 지금)). 시간이 흐르면 자동으로 따라간다.
export const usePlanDraft = () => {
  const now = useNow(30_000);
  const nowMin = minuteOfDayOf(now);
  const draftStart = useDraftStore((state) => state.startMin);
  const endMin = useDraftStore((state) => state.endMin);
  const setDraft = useDraftStore((state) => state.setDraft);
  const startMin = Math.max(draftStart, nowMin);
  const available = endMin - startMin;
  return { now, nowMin, draftStart, startMin, endMin, available, timeValid: available > 0, setDraft };
};
