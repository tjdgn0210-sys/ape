import { useEffect, useState } from 'react';

type PersistedStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
};

// persist 스토어가 저장소에서 값을 다 읽어 왔는지. 읽기 전에 그리면 빈 값이 잠깐 보인다.
export const useHydrated = (store: PersistedStore) => {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);

  return hydrated;
};
