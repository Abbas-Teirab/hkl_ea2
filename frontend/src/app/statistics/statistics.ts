import { Component, computed, resource, inject, signal } from '@angular/core';
import { BubbleChart } from './bubble-chart/bubble-chart';
import { notificationsStore } from '../stores/notifications.store';
import { NodesStore } from '../stores/nodes.store';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { startOfDay, endOfDay, format } from 'date-fns';
import { BarChart } from './bar-chart/bar-chart';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { SupabaseConfig, SupabaseToken } from '../../supabase';
import { Sensor } from '../interfaces/sensors';
import { formatISO } from 'date-fns';

@Component({
  imports: [
    BarChart,
    BubbleChart,
    MatIconModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    FormField,
  ],
  selector: 'app-statistics',
  styleUrl: './statistics.scss',
  templateUrl: './statistics.html',
  providers: [provideNativeDateAdapter()],
})
export class Statistics {
  private nodesStore = inject(NodesStore);
  private notificationsStore = inject(notificationsStore);
  private supabaseConfig: SupabaseConfig = inject(SupabaseToken);

  today = format(new Date(), 'yyyy-MM-dd');

  nodes = this.nodesStore.nodes;

  readings = resource({
    defaultValue: [],
    params: () => ({
      sensors_notifier: this.notificationsStore.sensors_notifier(),
      nodes: this.nodes(),
      from_date: this.model().from_date,
      to_date: this.model().to_date,
    }),
    loader: async ({ params }) => {
      const { nodes, from_date, to_date } = params;
      const from = formatISO(startOfDay(new Date(from_date)));
      const to = formatISO(endOfDay(new Date(to_date)));

      const { data, error } = await this.supabaseConfig.supabase
        .from('sensors')
        .select('*')
        .gte('created_at', from) // Start date (inclusive)
        .lte('created_at', to); // End date (inclusive)

      const sensors_readings: Sensor[] = data ?? [];
      return nodes
        .filter((node) => node.enabled)
        .filter((node) => sensors_readings.some((sensor) => sensor.name === node.name))
        .map((node) => sensors_readings.filter((sensor) => sensor.name === node.name));
    },
  });

  average_temperatures = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.readings.value()[index] ?? [];
      const temperatures = readings.map((sensor) => sensor.temperature);
      const sum = temperatures.reduce((acc, curr) => acc + curr, 0);
      return temperatures.length ? sum / temperatures.length : 0;
    }),
  );

  max_average_temperature = computed(() => Math.max(...this.average_temperatures()));

  average_humidity = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.readings.value()[index] ?? [];
      const humidity = readings.map((sensor) => sensor.humidity);
      const sum = humidity.reduce((acc, curr) => acc + curr, 0);
      return humidity.length ? sum / humidity.length : 0;
    }),
  );

  max_average_humidity = computed(() => Math.max(...this.average_humidity()));
  average_pressure = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.readings.value()[index] ?? [];
      const pressure = readings.map((sensor) => sensor.pressure);
      const sum = pressure.reduce((acc, curr) => acc + curr, 0);
      return pressure.length ? sum / pressure.length : 0;
    }),
  );

  average_altitude = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.readings.value()[index] ?? [];
      const altitude = readings.map((sensor) => sensor.altitude);
      const sum = altitude.reduce((acc, curr) => acc + curr, 0);
      return altitude.length ? sum / altitude.length : 0;
    }),
  );

  bubble_values = computed(() =>
    this.nodes().map((node, index) => {
      const average_temperature = this.average_temperatures()[index] ?? 0;
      const average_humidity = this.average_humidity()[index] ?? 0;
      const average_pressure = (5 * (this.average_pressure()[index] ?? 0)) / 1000;
      const val = {
        x: average_temperature,
        y: average_humidity,
        r: average_pressure,
      };
      return val;
    }),
  );

  model = signal({
    from_date: new Date().toISOString(),
    to_date: new Date().toISOString(),
  });

  form = form(this.model);
}
