import { signalStore, withState, withMethods, withHooks, patchState } from '@ngrx/signals';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { SupabaseConfig, SupabaseToken } from '../../supabase';
import { switchMap, tap } from 'rxjs/operators';
import { from, pipe } from 'rxjs';
import { Sensor } from '../interfaces/sensors';

interface SensorsState {
  loading: boolean;
  sensors: Sensor[];
}
export const SensorsStore = signalStore(
  { providedIn: 'root' },
  withState<SensorsState>({
    loading: true,
    sensors: [],
  }),
  withMethods((store, supabaseConfig: SupabaseConfig = inject(SupabaseToken)) => ({
    fetchNodeData: async (node: string) => {
      const { data, error } = await supabaseConfig.supabase
        .from('sensors')
        .select('*')
        .eq('name', node);
      return { data, error };
    },
    loadSensors: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          from(
            supabaseConfig.supabase
              .from('sensors')
              .select('*')
              .order('created_at', { ascending: false }),
          ),
        ),
        tapResponse({
          next: ({ data, error }) => patchState(store, { loading: false, sensors: data ?? [] }),
          error: (e) => {
            patchState(store, { loading: false, sensors: [] });
          },
          finalize: () => patchState(store, { loading: false, sensors: [] }),
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
