import { Component, computed, inject } from '@angular/core';
import { SensorsStore } from '../stores/sensors.store';
import { SensorReading } from './sensor-reading/sensor-reading';
import { NodesStore } from '../stores/nodes.store';
import { Sensor } from '../interfaces/sensors';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sensors-readings',
  styleUrl: './sensors-readings.css',
  templateUrl: './sensors-readings.html',
  imports: [MatIconModule, SensorReading],
})
export class SensorsReadings {
  private nodesStore = inject(NodesStore);
  private sensorsStore = inject(SensorsStore);

  readings = computed(() =>
    this.nodesStore
      .nodes()
      .filter((node) => node.enabled)
      .filter((node) => this.sensorsStore.sensors().some((sensor) => sensor.name === node.name))
      .map(
        (node) => this.sensorsStore.sensors().find((sensor) => sensor.name === node.name) as Sensor,
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}
