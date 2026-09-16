import { Component, computed, inject, signal } from '@angular/core';
import { SensorsStore } from '../stores/sensors.store';
import { SensorReading } from './sensor-reading/sensor-reading';
import { NodesStore } from '../stores/nodes.store';
import { Sensor } from '../interfaces/sensors';
import { MatIconModule } from '@angular/material/icon';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { addMinutes, format } from 'date-fns';

@Component({
  selector: 'app-sensors-readings',
  styleUrl: './sensors-readings.scss',
  templateUrl: './sensors-readings.html',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatIconModule, SensorReading],
})
export class SensorsReadings {
  private nodesStore = inject(NodesStore);
  private sensorsStore = inject(SensorsStore);

  readings = computed(() => {
    const search_term = this.model().search.toLowerCase() ?? '';
    return (
      this.nodesStore
        .nodes()
        .filter((node) => node.enabled)
        // .filter((node) => this.sensorsStore.sensors().some((sensor) => sensor.name === node.name))
        .filter(
          (node) =>
            node.name.toLowerCase().includes(search_term) ||
            node.location.toLowerCase().includes(search_term),
        )
        .map((node) => {
          const reading = this.sensorsStore.sensors().find((sensor) => sensor.name === node.name);
          if (!!reading) {
            return reading;
          }
          const default_reading: Sensor = {
            name: node.name,
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
        })
        .sort((a, b) => {
          if (!a || !b) return 0;
          return a.name.localeCompare(b.name);
        })
    );
  });

  model = signal({
    search: '',
  });

  form = form(this.model);
}
