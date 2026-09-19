import { Component, resource, inject, signal, computed, viewChild } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { Sensor } from '../interfaces/sensors';
import { DatePipe } from '@angular/common';
import { SupabaseToken } from '../../supabase';
import { endOfDay, format, formatISO, startOfDay } from 'date-fns';
import { form, FormField } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { notificationsStore } from '../stores/notifications.store';
import { MatButtonModule } from '@angular/material/button';
import * as XLSX from 'xlsx';

@Component({
  imports: [
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    FormField,
    DatePipe,
  ],
  selector: 'app-data-export',
  styleUrl: './data-export.scss',
  templateUrl: './data-export.html',
  providers: [provideNativeDateAdapter()],
})
export class DataExport {
  private notificationsStore = inject(notificationsStore);
  private supabase: SupabaseClient = inject(SupabaseToken);

  protected readonly displayedColumns = [
    'node',
    'location',
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

  paginator = viewChild<MatPaginator>(MatPaginator);

  nodes = resource({
    defaultValue: [],
    params: () => ({
      nodes_notifier: this.notificationsStore.nodes_notifier(),
    }),
    loader: async ({ params }) => {
      const { nodes_notifier } = params;
      const { data: nodes } = await this.supabase
        .from('nodes')
        .select('*')
        .order('name', { ascending: true });
      return nodes ?? [];
    },
  });

  history = resource({
    defaultValue: [],
    params: () => ({
      sensors_notifier: this.notificationsStore.sensors_notifier(),
      from_date: this.model().from_date,
      to_date: this.model().to_date,
      nodes: this.nodes.value(),
    }),
    loader: async ({ params }) => {
      const { sensors_notifier, from_date, to_date, nodes } = params;
      const from = formatISO(startOfDay(new Date(from_date)));
      const to = formatISO(endOfDay(new Date(to_date)));
      const { data, error } = await this.supabase
        .from('sensors')
        .select('*')
        .order('created_at', { ascending: false })
        .gte('created_at', from) // Start date (inclusive)
        .lte('created_at', to); // End date (inclusive)

      const list: Sensor[] = data ?? [];
      return list;
    },
  });

  locations = computed(() =>
    this.history
      .value()
      .map(
        (sensor) => this.nodes.value().find((node) => node.name === sensor.name)?.location ?? '',
      ),
  );

  datasource = computed(() => {
    const source = new MatTableDataSource<Sensor>(this.history.value());
    if (this.paginator()) {
      source.paginator = this.paginator() as MatPaginator;
    }
    return source;
  });

  loading = computed(() => this.history.isLoading() || this.nodes.isLoading());

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

  async exportData() {
    const templatePath = '/sensors.xlsx';
    const toSheet = (rows: Record<string, unknown>[]) =>
      XLSX.utils.json_to_sheet(rows.length ? rows : []);
    try {
      const response = await fetch(templatePath, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Template workbook not found at ${templatePath}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) {
        throw new Error(
          `Template request returned HTML instead of XLSX. Verify ${templatePath} exists in frontend/public.`,
        );
      }

      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sensorRows = this.history.value().map((sensor) => ({
        id: sensor.id,
        node: sensor.name,
        date: format(new Date(sensor.created_at ?? ''), 'dd MMM yyyy'),
        time: format(new Date(sensor.created_at ?? ''), 'HH:mm:ss'),
        ip_address: sensor.ip_address,
        locked: sensor.locked,
        temperature: sensor.temperature,
        humidity: sensor.humidity,
        pressure: sensor.pressure,
        altitude: sensor.altitude,
      }));
      workbook.Sheets['Sensors'] = toSheet(sensorRows);

      const wbBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      const blob = new Blob([wbBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensors_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);
    }
  }
}
