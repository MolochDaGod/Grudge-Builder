import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { islandSessionMachine } from './islandSessionMachine';

export function useIslandSession(characterId?: string) {
  const [state, send] = useMachine(islandSessionMachine);

  useEffect(() => {
    send({ type: 'START', characterId });
  }, [characterId, send]);

  return {
    sessionState: state.value as string,
    context: state.context,
    send,
    isPlaying: state.matches('playing'),
    isLoading: state.matches('loadingCharacter') || state.matches('loadingWorld'),
    hasError: state.matches('error'),
  };
}