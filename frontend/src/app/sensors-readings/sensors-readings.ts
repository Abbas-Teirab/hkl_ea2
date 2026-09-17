import { Component, computed, inject, signal } from '@angular/core';
import { notificationsStore } from '../stores/notifications.store';
import { SensorReading } from './sensor-reading/sensor-reading';
import { NodesStore } from '../stores/nodes.store';
import { Sensor } from '../interfaces/sensors';
import { MatIconModule } from '@angular/material/icon';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { addMinutes, format } from 'date-fns';
import { SupabaseConfig, SupabaseToken } from '../../supabase';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, from, forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-sensors-readings',
  styleUrl: './sensors-readings.scss',
  templateUrl: './sensors-readings.html',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatIconModule, SensorReading],
})
export class SensorsReadings {
  private nodesStore = inject(NodesStore);
  private notificationsStore = inject(notificationsStore);
  private supabaseConfig: SupabaseConfig = inject(SupabaseToken);

  readings = rxResource({
    defaultValue: [],
    params: () => ({
      search_term: this.model().search.toLowerCase() ?? '',
      sensors_notifier: this.notificationsStore.sensors_notifier(),
      nodes: this.nodesStore.nodes(),
    }),
    stream: ({ params }) => {
      const { sensors_notifier, search_term, nodes } = params;
      const filteres_nodes = this.nodesStore
        .nodes()
        .filter((node) => node.enabled)
        .filter(
          (node) =>
            node.name.toLowerCase().includes(search_term) ||
            node.location.toLowerCase().includes(search_term),
        );

      return filteres_nodes.length > 0
        ? forkJoin(
            filteres_nodes
              .map((node) => node.name)
              .map((node_name) =>
                from(
                  this.supabaseConfig.supabase
                    .from('sensors')
                    .select('*')
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
            map((readings) =>
              readings.sort((a, b) => {
                if (!a || !b) return 0;
                return a.name.localeCompare(b.name);
              }),
            ),
          )
        : of([]);
    },
  });

  model = signal({
    search: '',
  });

  form = form(this.model);
}
