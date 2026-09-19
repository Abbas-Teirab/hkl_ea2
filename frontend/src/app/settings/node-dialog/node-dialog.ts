import { Component, inject, effect, Signal, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormField, form, required, minLength, min } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Node } from '../../interfaces/nodes';

@Component({
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    FormField,
  ],
  selector: 'app-node-dialog',
  styleUrl: './node-dialog.scss',
  templateUrl: './node-dialog.html',
})
export class NodeDialog {
  constructor() {
    effect(() => {
      if (this.node()) {
        this.initializeForm();
      }
    });
  }
  readonly dialogRef = inject(MatDialogRef<NodeDialog>);
  data = inject<Signal<Node | undefined>>(MAT_DIALOG_DATA);
  node = computed<Node | undefined>(() => this.data());

  model = signal<Node>({
    name: '',
    location: '',
    transmission_period: 60,
    enabled: true,
  });

  form = form(this.model, (schema) => {
    required(schema.name);
    minLength(schema.name, 3);
    required(schema.location);
    minLength(schema.location, 3);
    required(schema.transmission_period);
    min(schema.transmission_period, 1);
  });

  initializeForm() {
    const node = this.node();

    this.model.set({
      name: node?.name ?? '',
      location: node?.location ?? '',
      enabled: node?.enabled ?? true,
      transmission_period: node?.transmission_period ?? 60,
    });
  }

  save() {
    const node: Node = {
      ...(this.node()?.id ? { id: this.node()?.id } : {}),
      ...(this.node()?.created_at ? { created_at: this.node()?.created_at } : {}),
      name: this.model().name,
      location: this.model().location,
      enabled: this.model().enabled,
      transmission_period: this.model().transmission_period,
    };
    this.dialogRef.close(node);
  }
}
