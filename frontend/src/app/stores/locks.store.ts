import { signalStore, withState, withMethods, withHooks, patchState } from '@ngrx/signals';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { SupabaseConfig, SupabaseToken } from '../../supabase';
import { switchMap, tap } from 'rxjs/operators';
import { from, pipe } from 'rxjs';
import { Lock } from '../interfaces/locks';

interface LocksState {
  loading: boolean;
  locks: Lock[];
}
export const LocksStore = signalStore(
  { providedIn: 'root' },
  withState<LocksState>({
    loading: true,
    locks: [],
  }),
  withMethods((store, supabase: SupabaseConfig = inject(SupabaseToken)) => ({
    loadLocks: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          from(
            supabase.supabase.from('locks').select('*').order('created_at', { ascending: false }),
          ),
        ),
        tapResponse({
          next: ({ data, error }) => patchState(store, { loading: false, locks: data ?? [] }),
          error: (e) => {
            patchState(store, { loading: false, locks: [] });
          },
          finalize: () => patchState(store, { loading: false, locks: [] }),
        }),
      ),
    ),
  })),
  withHooks({
    onInit({ loadLocks }) {
      loadLocks();
    },
    onDestroy(store) {
      console.log('On destroy');
    },
  }),
);
