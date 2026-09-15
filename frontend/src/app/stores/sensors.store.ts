import { signalStore, withState, withMethods, withHooks, patchState } from '@ngrx/signals';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { SupabaseConfig, SupabaseToken } from '../../supabase';
import { switchMap, tap } from 'rxjs/operators';
import { from, pipe } from 'rxjs';
import { Reading } from '../interfaces/sensors';

interface SensorsState {
  loading: boolean;
  readings: Reading[];
}
export const SensorsStore = signalStore(
  { providedIn: 'root' },
  withState<SensorsState>({
    loading: true,
    readings: [],
  }),
  withMethods((store, supabase: SupabaseConfig = inject(SupabaseToken)) => ({
    loadSensors: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          from(
            supabase.supabase.from('sensors').select('*').order('created_at', { ascending: false }),
          ),
        ),
        tapResponse({
          next: ({ data, error }) => patchState(store, { loading: false, readings: data ?? [] }),
          error: (e) => {
            patchState(store, { loading: false, readings: [] });
          },
          finalize: () => patchState(store, { loading: false, readings: [] }),
        }),
      ),
    ),
  })),
  withHooks({
    onInit({ loadSensors }) {
      loadSensors();
    },
    onDestroy(store) {
      console.log('On destroy');
    },
  }),
);
