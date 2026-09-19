import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

interface notificationsState {
  nodes_notifier: boolean;
  sensors_notifier: boolean;
  locks_notifier: boolean;
}

export const notificationsStore = signalStore(
  { providedIn: 'root' },
  withState<notificationsState>({
    nodes_notifier: false,
    sensors_notifier: false,
    locks_notifier: false,
  }),
  withMethods((store) => ({
    toggleNodesNotifier: () =>
      patchState(store, (state) => ({ nodes_notifier: !state.nodes_notifier })),
    toggleSensorsNotifier: () =>
      patchState(store, (state) => ({ sensors_notifier: !state.sensors_notifier })),
    toggleLocksNotifier: () =>
      patchState(store, (state) => ({ locks_notifier: !state.locks_notifier })),
  })),
);
