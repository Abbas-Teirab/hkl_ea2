import { Component, computed, inject, signal } from '@angular/core';
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
import { LocksStore } from '../stores/locks.store';
import { Lock } from '../interfaces/locks';

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
  selector: 'app-locks-triggers',
  styleUrl: './locks-triggers.scss',
  templateUrl: './locks-triggers.html',
})
export class LocksTriggers {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private locksStore = inject(LocksStore);

  protected readonly displayedColumns = ['name', 'locked', 'created_at'];
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly filterDept = signal('');
  protected readonly filterLocation = signal('');
  protected readonly filterStatus = signal('');
  protected readonly sortField = signal<keyof Lock>('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  loading = this.locksStore.loading;

  protected readonly locks = computed(() => {
    const search_term = this.model().search.toLowerCase() ?? '';
    const list = [...this.locksStore.locks()].filter(
      (lock) =>
        lock.name.toLowerCase().includes(search_term) ||
        lock.locked.toString().toLowerCase().includes(search_term) ||
        lock.created_at?.toLowerCase()?.includes(search_term),
    );
    const field = this.sortField();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const av = a[field] ?? '';
      const bv = b[field] ?? '';
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  datasource = computed(() => this.locks());

  model = signal({
    search: '',
  });

  form = form(this.model);
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
}
