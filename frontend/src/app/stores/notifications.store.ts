import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

interface notificationsState {
  sensors_notifier: boolean;
  locks_notifier: boolean;
}

export const notificationsStore = signalStore(
  { providedIn: 'root' },
  withState<notificationsState>({
    sensors_notifier: false,
    locks_notifier: false,
  }),
  withMethods((store) => ({
    toggleSensorsNotifier: () =>
      patchState(store, (state) => ({ sensors_notifier: !state.sensors_notifier })),
    toggleLocksNotifier: () =>
      patchState(store, (state) => ({ locks_notifier: !state.locks_notifier })),
  })),
);
