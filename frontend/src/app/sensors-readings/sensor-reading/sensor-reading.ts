import { Component, computed, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgxGaugeModule } from 'ngx-gauge';
import { Sensor } from '../../interfaces/sensors';
import { formatNumber, DatePipe } from '@angular/common';
import { NodesStore } from '../../stores/nodes.store';

@Component({
  imports: [MatCardModule, MatIconModule, NgxGaugeModule, DatePipe],
  selector: 'app-sensor-reading',
  styleUrl: './sensor-reading.scss',
  templateUrl: './sensor-reading.html',
})
export class SensorReading {
  private nodes_store = inject(NodesStore);
  size = 80;
  thick = 4;
  node = computed(() =>
    this.nodes_store.nodes().find((n) => n.name === this.sensor_reading().name),
  );
  sensor_reading = input.required<Sensor>();
  formatted_temperature_value = computed(() =>
    parseFloat(formatNumber(this.sensor_reading().temperature, 'en-US', '1.1-1')),
  );
  temperature_thresholds = {
    '0': { color: 'green' },
    '30': { color: 'orange' },
    '60': { color: 'red' },
  };
  //-------------------------------------------------
  formatted_humidity_value = computed(() =>
    parseFloat(formatNumber(this.sensor_reading().humidity, 'en-US', '1.1-1')),
  );
  humidity_thresholds = {
    '0': { color: 'green' },
    '30': { color: 'orange' },
    '60': { color: 'red' },
  };
}
