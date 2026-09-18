import { Component, computed, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgxGaugeModule } from 'ngx-gauge';
import { Sensor } from '../../interfaces/sensors';
import { formatNumber, DatePipe } from '@angular/common';
import { NodesStore } from '../../stores/nodes.store';
import { RouterLink } from '@angular/router';
import { addMinutes, differenceInMinutes, formatDistanceToNow } from 'date-fns';

@Component({
  imports: [MatCardModule, MatIconModule, NgxGaugeModule, DatePipe, RouterLink],
  selector: 'app-sensor-reading',
  styleUrl: './sensor-reading.scss',
  templateUrl: './sensor-reading.html',
})
export class SensorReading {
  private nodes_store = inject(NodesStore);
  size = 100;
  thick = 4;

  sensor_reading = input.required<Sensor>();
  last_reading = computed(() =>
    this.sensor_reading().created_at
      ? formatDistanceToNow(new Date(this.sensor_reading().created_at as string))
      : 'N/A',
  );
  node = computed(() =>
    this.nodes_store.nodes().find((n) => n.name === this.sensor_reading().name),
  );
  is_online = computed(() => {
    const creation = this.sensor_reading().created_at
      ? new Date(this.sensor_reading().created_at as string)
      : addMinutes(new Date(), -10);
    return differenceInMinutes(new Date(), creation) < 5;
  });
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
  //-------------------------------------------------
  formatted_pressure_value = computed(() =>
    parseFloat(formatNumber(this.sensor_reading().pressure / 1000, 'en-US', '2.2-2')),
  );
  pressure_thresholds = {
    '0': { color: 'green' },
    '30': { color: 'orange' },
    '60': { color: 'red' },
  };
  //-------------------------------------------------
  formatted_altitude_value = computed(() =>
    parseFloat(formatNumber(this.sensor_reading().altitude, 'en-US', '1.1-1')),
  );
  altitude_thresholds = {
    '0': { color: 'green' },
    '80': { color: 'orange' },
    '90': { color: 'red' },
  };
}
