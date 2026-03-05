import { useFocusEffect } from '@react-navigation/native';
import * as React from 'react';

export function useRefetchOnFocus(refetch: () => Promise<unknown>, enabled = true) {
  useFocusEffect(
    React.useCallback(() => {
      if (!enabled) {
        return;
      }
      void refetch();
    }, [enabled, refetch]),
  );
}

export function usePullToRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    }
    finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return {
    refreshing,
    onRefresh,
  };
}
