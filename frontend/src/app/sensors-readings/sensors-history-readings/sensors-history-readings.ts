import { Component, input, resource, inject, signal, computed, viewChild } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { SensorsStore } from '../../stores/sensors.store';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { Sensor } from '../../interfaces/sensors';
import { DatePipe } from '@angular/common';

@Component({
  imports: [
    DatePipe,
    MatProgressSpinnerModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
  ],
  selector: 'app-sensors-history-readings',
  styleUrl: './sensors-history-readings.scss',
  templateUrl: './sensors-history-readings.html',
})
export class SensorsHistoryReadings {
  private sensorsStore = inject(SensorsStore);

  protected readonly displayedColumns = [
    'date',
    'time',
    'temperature',
    'humidity',
    'pressure',
    'altitude',
    'locked',
  ];

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly filterStatus = signal('');
  protected readonly sortField = signal<keyof Sensor>('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  id = input<string>();
  paginator = viewChild<MatPaginator>(MatPaginator);
  history = resource({
    defaultValue: [],
    params: () => ({ id: this.id() }),
    loader: async ({ params }) => {
      const { id } = params;
      if (!id) {
        return [];
      }
      const res = await this.sensorsStore.fetchNodeData(id);
      const list: Sensor[] = res.data ?? [];
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
    this.history.value();
  });

  loading = computed(() => this.history.isLoading());

  protected onSort(sort: Sort) {
    console.log(sort);
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
