import { signalStore, withState, withMethods, withHooks, patchState } from '@ngrx/signals';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { SupabaseConfig, SupabaseToken } from '../../supabase';
import { switchMap, tap } from 'rxjs/operators';
import { from, pipe } from 'rxjs';
import { Node } from '../interfaces/nodes';

interface NodesState {
  loading: boolean;
  nodes: Node[];
}
export const NodesStore = signalStore(
  { providedIn: 'root' },
  withState<NodesState>({
    loading: true,
    nodes: [],
  }),
  withMethods((store, supabaseConfig: SupabaseConfig = inject(SupabaseToken)) => ({
    createNode: async (node: Node) => {
      const { data, error } = await supabaseConfig.supabase.from('nodes').insert(node);
    },
    updateNode: async (node: Node) => {
      const { data, error } = await supabaseConfig.supabase
        .from('nodes')
        .update(node)
        .eq('id', node.id);
    },
    loadNodes: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          from(
            supabaseConfig.supabase.from('nodes').select('*').order('name', { ascending: true }),
          ),
        ),
        tapResponse({
          next: ({ data, error }) => patchState(store, { loading: false, nodes: data ?? [] }),
          error: (e) => {
            patchState(store, { loading: false, nodes: [] });
          },
          finalize: () => patchState(store, { loading: false, nodes: [] }),
        }),
      ),
    ),
  })),
  withHooks({
    onInit({ loadNodes }) {
      loadNodes();
    },
    onDestroy(store) {
      console.log('On destroy');
    },
  }),
);
