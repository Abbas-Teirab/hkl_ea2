import { Component, computed, effect, inject, resource, signal, viewChild } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Lock } from '../interfaces/locks';
import { DatePipe } from '@angular/common';
import { notificationsStore } from '../stores/notifications.store';
import { SupabaseConfig, SupabaseToken } from '../../supabase';
import { endOfDay, format, formatISO, startOfDay } from 'date-fns';
import { NodesStore } from '../stores/nodes.store';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';

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
    MatDatepickerModule,
    FormField,
    DatePipe,
  ],
  selector: 'app-locks-triggers',
  styleUrl: './locks-triggers.scss',
  templateUrl: './locks-triggers.html',
  providers: [provideNativeDateAdapter()],
})
export class LocksTriggers {
  private notificationsStore = inject(notificationsStore);
  private nodesStore = inject(NodesStore);
  private supabaseConfig: SupabaseConfig = inject(SupabaseToken);

  protected readonly displayedColumns = ['name', 'location', 'locked', 'date', 'time'];
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(5);
  protected readonly filterDept = signal('');
  protected readonly filterLocation = signal('');
  protected readonly filterStatus = signal('');
  protected readonly sortField = signal<keyof Lock>('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');

  today = format(new Date(), 'yyyy-MM-dd');
  nodes = this.nodesStore.nodes;
  loading = computed(() => this.locks.isLoading());
  paginator = viewChild<MatPaginator>(MatPaginator);

  locks = resource({
    defaultValue: [],
    params: () => ({
      search_term: this.model().search.toLowerCase() ?? '',
      locks_notifier: this.notificationsStore.locks_notifier(),
      from_date: this.model().from_date,
      to_date: this.model().to_date,
      nodes: this.nodesStore.nodes(),
    }),
    loader: async ({ params }) => {
      const { search_term, from_date, to_date, nodes } = params;
      const from = formatISO(startOfDay(new Date(from_date)));
      const to = formatISO(endOfDay(new Date(to_date)));

      const { data, error } = await this.supabaseConfig.supabase
        .from('locks')
        .select('*')
        .gte('created_at', from) // Start date (inclusive)
        .lte('created_at', to); // End date (inclusive)

      const locks_readings: Lock[] = data ?? [];
      const field = this.sortField();
      const dir = this.sortDir() === 'asc' ? 1 : -1;

      const filtered_nodes = nodes
        .filter(
          (node) =>
            node.name.toLowerCase().includes(search_term) ||
            node.location.toLowerCase().includes(search_term),
        )
        .map((node) => locks_readings.filter((lock) => lock.name === node.name))
        .flat()
        .sort((a, b) => {
          const av = a[field] ?? '';
          const bv = b[field] ?? '';
          return av < bv ? -dir : av > bv ? dir : 0;
        });

      return filtered_nodes;
    },
  });

  locations = computed(() =>
    this.locks.value().map((lock) => {
      const node = this.nodes().find((node) => node.name === lock.name);
      return node?.location ?? '';
    }),
  );

  datasource = computed(() => {
    const source = new MatTableDataSource<Lock>(this.locks.value());
    if (this.paginator()) {
      source.paginator = this.paginator() as MatPaginator;
    }
    return source;
  });

  protected onSort(sort: Sort) {
    if (sort.direction) {
      this.sortField.set(sort.active as keyof Lock);
      this.sortDir.set(sort.direction);
    }
    this.pageIndex.set(0);
  }

  protected onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  model = signal({
    search: '',
    from_date: new Date().toISOString(),
    to_date: new Date().toISOString(),
  });

  form = form(this.model);
}
