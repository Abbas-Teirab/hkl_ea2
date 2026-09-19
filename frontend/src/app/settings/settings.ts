import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Node } from '../interfaces/nodes';
import { NodeDialog } from './node-dialog/node-dialog';
import { notificationsStore } from '../stores/notifications.store';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseToken } from '../../supabase';

@Component({
  imports: [
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    FormField,
  ],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private notificationsStore = inject(notificationsStore);

  protected readonly displayedColumns = [
    'name',
    'location',
    'transmission_period',
    'enabled',
    'edit',
  ];
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly filterDept = signal('');
  protected readonly filterLocation = signal('');
  protected readonly filterStatus = signal('');
  protected readonly sortField = signal<keyof Node>('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  private dialog_loading = signal(false);
  private supabase: SupabaseClient = inject(SupabaseToken);

  nodes = resource({
    defaultValue: [],
    params: () => ({
      search_term: this.model().search,
      nodes_notifier: this.notificationsStore.nodes_notifier(),
    }),
    loader: async ({ params }) => {
      const { nodes_notifier, search_term } = params;
      const { data: nodes } = await this.supabase
        .from('nodes')
        .select('*')
        .order('name', { ascending: true });
      const list = (nodes ?? []).filter(
        (node) =>
          node.name.toLowerCase().includes(search_term.toLowerCase()) ||
          node.location.toLowerCase().includes(search_term.toLowerCase()) ||
          node.enabled.toString().toLowerCase().includes(search_term.toLowerCase()),
      );
      const field = this.sortField();
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      return list.sort((a, b) => {
        const av = a[field] ?? '';
        const bv = b[field] ?? '';
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    },
  });

  datasource = computed(() => this.nodes.value());
  loading = computed(() => this.nodes.isLoading() || this.dialog_loading());

  model = signal({
    search: '',
  });

  form = form(this.model);

  protected openNodeDialog(node?: Node) {
    const ref = this.dialog.open(NodeDialog, {
      height: '400px',
      width: '400px',
      data: signal(node),
    });

    ref.afterClosed().subscribe(async (result: Node | undefined) => {
      if (!result) return;
      this.dialog_loading.set(true);
      if (result.id) {
        await this.supabase
          .from('nodes')
          .update({
            name: result.name,
            location: result.location,
            enabled: result.enabled,
          })
          .eq('id', result.id);
        this.notificationsStore.toggleNodesNotifier();
      } else {
        await this.supabase.from('nodes').insert({
          name: result.name,
          location: result.location,
          enabled: result.enabled,
        });
        this.notificationsStore.toggleNodesNotifier();
      }
      this.snackBar.open('Node saved successfully', 'Close', { duration: 3000 });
      this.dialog_loading.set(false);
    });
  }
  protected onSort(sort: Sort) {
    if (sort.direction) {
      this.sortField.set(sort.active as keyof Node);
      this.sortDir.set(sort.direction);
    }
    this.pageIndex.set(0);
  }
  protected onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }
}
