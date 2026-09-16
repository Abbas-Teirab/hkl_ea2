import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { NodesStore } from '../stores/nodes.store';
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
import { TitleCasePipe } from '@angular/common';

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
    TitleCasePipe,
  ],
  selector: 'app-nodes-list',
  styleUrl: './nodes-list.scss',
  templateUrl: './nodes-list.html',
})
export class NodesList {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private nodesStore = inject(NodesStore);

  protected readonly displayedColumns = ['name', 'location', 'enabled', 'edit'];
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly filterDept = signal('');
  protected readonly filterLocation = signal('');
  protected readonly filterStatus = signal('');
  protected readonly sortField = signal<keyof Node>('name');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  loading = this.nodesStore.loading;

  nodes = computed(() => {
    const search_term = this.model().search.toLowerCase() ?? '';
    const list = this.nodesStore
      .nodes()
      .filter(
        (node) =>
          node.name.toLowerCase().includes(search_term) ||
          node.location.toLowerCase().includes(search_term) ||
          node.enabled.toString().toLowerCase().includes(search_term),
      );
    const field = this.sortField();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const av = a[field] ?? '';
      const bv = b[field] ?? '';
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  datasource = computed(() => this.nodes());

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
