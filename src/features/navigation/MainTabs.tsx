import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { BottomTabs, type TabItem } from '@/components/ui';

export type MainTabKey = 'tasks' | 'schedule' | 'history';

// 할 일·계획표·기록 탭. 할 일 탭은 항상 "오늘의 계획" 화면(/)으로 간다(시간·할 일·쉬는 시간을 한 화면에서 정한다).
export const MainTabs = ({ active }: { active: MainTabKey }) => {
  const router = useRouter();

  const tabs = useMemo<readonly TabItem[]>(() => {
    const go = (key: MainTabKey, href: '/' | '/schedule' | '/history') => () => {
      if (key !== active) router.replace(href);
    };
    return [
      { key: 'tasks', label: '할 일', icon: 'tabTodo', iconSize: 22, onPress: go('tasks', '/') },
      { key: 'schedule', label: '계획표', icon: 'tabTimer', iconSize: 22, onPress: go('schedule', '/schedule') },
      { key: 'history', label: '달력', icon: 'tabCalendar', iconSize: 22, onPress: go('history', '/history') },
    ];
  }, [active, router]);

  return <BottomTabs tabs={tabs} activeKey={active} />;
};
