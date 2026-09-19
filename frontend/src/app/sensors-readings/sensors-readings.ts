import { Component, computed, inject, resource, signal } from '@angular/core';
import { notificationsStore } from '../stores/notifications.store';
import { SensorReading } from './sensor-reading/sensor-reading';
import { Sensor } from '../interfaces/sensors';
import { MatIconModule } from '@angular/material/icon';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { addMinutes } from 'date-fns';
import { SupabaseToken } from '../../supabase';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, from, forkJoin, map } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';

@Component({
  selector: 'app-sensors-readings',
  styleUrl: './sensors-readings.scss',
  templateUrl: './sensors-readings.html',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatIconModule, SensorReading],
})
export class SensorsReadings {
  private notificationsStore = inject(notificationsStore);
  private supabase: SupabaseClient = inject(SupabaseToken);

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

  readings = rxResource({
    defaultValue: [],
    params: () => ({
      search_term: this.model().search.toLowerCase() ?? '',
      nodes_notifier: this.notificationsStore.nodes_notifier(),
      sensors_notifier: this.notificationsStore.sensors_notifier(),
      nodes: this.nodes.value(),
    }),
    stream: ({ params }) => {
      const { nodes_notifier, sensors_notifier, search_term, nodes } = params;
      const filteres_nodes = nodes
        .filter((node) => node.enabled)
        .filter(
          (node) =>
            node.name.toLowerCase().includes(search_term) ||
            node.location.toLowerCase().includes(search_term),
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      return filteres_nodes.length > 0
        ? forkJoin(
            filteres_nodes
              .map((node) => node.name)
              .map((node_name) =>
                from(
                  this.supabase
                    .from('sensors')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .eq('name', node_name)
                    .limit(1),
                ).pipe(
                  map((response) => response.data ?? []),
                  map((sensors) => sensors[0]),
                ),
              ),
          ).pipe(
            map((readings) =>
              readings.map((reading, index) => {
                if (!!reading) {
                  return reading as Sensor;
                }
                const default_reading: Sensor = {
                  name: filteres_nodes[index].name,
                  mac_address: 'N/A',
                  ip_address: 'N/A',
                  locked: true,
                  temperature: NaN,
                  humidity: NaN,
                  pressure: NaN,
                  altitude: NaN,
                  created_at: addMinutes(new Date(), -10).toISOString() as string,
                };
                return default_reading;
              }),
            ),
          )
        : of([]);
    },
  });

  loading = computed(() => this.nodes.isLoading() || this.readings.isLoading());

  model = signal({
    search: '',
  });

  form = form(this.model);
}
