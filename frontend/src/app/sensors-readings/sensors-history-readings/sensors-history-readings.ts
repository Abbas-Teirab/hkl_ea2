import { Component, input, resource, inject, signal, computed, viewChild } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { notificationsStore } from '../../stores/notifications.store';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { Sensor } from '../../interfaces/sensors';
import { DatePipe } from '@angular/common';
import { SupabaseConfig, SupabaseToken } from '../../../supabase';
import { endOfDay, format, formatISO, startOfDay } from 'date-fns';
import { form, FormField } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  imports: [
    DatePipe,
    MatProgressSpinnerModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    FormField,
  ],
  selector: 'app-sensors-history-readings',
  styleUrl: './sensors-history-readings.scss',
  templateUrl: './sensors-history-readings.html',
  providers: [provideNativeDateAdapter()],
})
export class SensorsHistoryReadings {
  private notificationsStore = inject(notificationsStore);
  private supabaseConfig: SupabaseConfig = inject(SupabaseToken);

  protected readonly displayedColumns = [
    'date',
    'time',
    'temperature',
    'humidity',
    'pressure',
    'altitude',
    'locked',
  ];
  today = format(new Date(), 'yyyy-MM-dd');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(5);
  protected readonly filterStatus = signal('');
  protected readonly sortField = signal<keyof Sensor>('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  id = input<string>();
  paginator = viewChild<MatPaginator>(MatPaginator);

  history = resource({
    defaultValue: [],
    params: () => ({
      id: this.id(),
      sensors_notifier: this.notificationsStore.sensors_notifier(),
      from_date: this.model().from_date,
      to_date: this.model().to_date,
    }),
    loader: async ({ params }) => {
      const { id, sensors_notifier, from_date, to_date } = params;
      if (!id) {
        return [];
      }
      const from = formatISO(startOfDay(new Date(from_date)));
      const to = formatISO(endOfDay(new Date(to_date)));
      const { data, error } = await this.supabaseConfig.supabase
        .from('sensors')
        .select('*')
        .eq('name', id)
        .gte('created_at', from) // Start date (inclusive)
        .lte('created_at', to); // End date (inclusive)

      const list: Sensor[] = data ?? [];
      const field = this.sortField();
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      return list.sort((a, b) => {
        const av = a[field] ?? '';
        const bv = b[field] ?? '';
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    },
  });

  datasource = computed(() => {
    const source = new MatTableDataSource<Sensor>(this.history.value());
    if (this.paginator()) {
      source.paginator = this.paginator() as MatPaginator;
    }
    return source;
  });

  loading = computed(() => this.history.isLoading());

  model = signal({
    from_date: new Date().toISOString(),
    to_date: new Date().toISOString(),
  });

  form = form(this.model);

  protected onSort(sort: Sort) {
    if (sort.direction) {
      this.sortField.set(sort.active as keyof Sensor);
      this.sortDir.set(sort.direction);
    }
    this.pageIndex.set(0);
  }
  protected onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }
}
