import { AppText } from '@/components/ui';
import { MAX_FAILURES } from '@/features/history/evolution';

type MissedNoticeProps = {
  // 시작을 놓친 일 수 / 그중 늦게라도 시작한 일 수(지금은 화면에 쓰지 않는다)
  count: number;
  lateCount: number;
  // 오늘이 이번 달 몇 번째 실패로 기록될지(5번째면 빨간 글자)
  failNo: number;
  remaining: number;
};

// 시작 시각부터 5분 안에 [시작]을 못 누른 할 일이 있을 때: 말은 이 한 줄만 보인다(사용자 요청: 글씨 줄이기).
export const MissedNotice = ({ failNo }: MissedNoticeProps) => (
  <AppText variant="itemTitle" color={failNo >= MAX_FAILURES ? 'danger' : 'ink'}>
    오늘은 실패로 기록돼요
  </AppText>
);
