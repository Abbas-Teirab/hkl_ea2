import { Component, computed, effect, inject, signal } from '@angular/core';
import { BubbleChart } from './bubble-chart/bubble-chart';
import { SensorsStore } from '../stores/sensors.store';
import { NodesStore } from '../stores/nodes.store';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { format } from 'date-fns';
import { BarChart } from './bar-chart/bar-chart';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
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
  private sensorsStore = inject(SensorsStore);
  today = format(new Date(), 'yyyy-MM-dd');
  from_date = signal(format(new Date(), 'yyyy-MM-dd'));
  to_date = signal(format(new Date(), 'yyyy-MM-dd'));

  nodes = this.nodesStore.nodes;
  nodes_readings = computed(() => {
    return this.nodes()
      .filter((node) => node.enabled)
      .filter((node) => this.sensorsStore.sensors().some((sensor) => sensor.name === node.name))
      .map((node) => this.sensorsStore.sensors().filter((sensor) => sensor.name === node.name));
  });

  average_temperatures = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.nodes_readings()[index] ?? [];
      const temperatures = readings.map((sensor) => sensor.temperature);
      const sum = temperatures.reduce((acc, curr) => acc + curr, 0);
      return temperatures.length ? sum / temperatures.length : 0;
    }),
  );

  max_average_temperature = computed(() => Math.max(...this.average_temperatures()));

  average_humidity = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.nodes_readings()[index] ?? [];
      const humidity = readings.map((sensor) => sensor.humidity);
      const sum = humidity.reduce((acc, curr) => acc + curr, 0);
      return humidity.length ? sum / humidity.length : 0;
    }),
  );

  max_average_humidity = computed(() => Math.max(...this.average_humidity()));
  average_pressure = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.nodes_readings()[index] ?? [];
      const pressure = readings.map((sensor) => sensor.pressure);
      const sum = pressure.reduce((acc, curr) => acc + curr, 0);
      return pressure.length ? sum / pressure.length : 0;
    }),
  );

  average_altitude = computed(() =>
    this.nodes().map((node, index) => {
      const readings = this.nodes_readings()[index] ?? [];
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
    from: '',
    to: '',
  });

  form = form(this.model);
}
