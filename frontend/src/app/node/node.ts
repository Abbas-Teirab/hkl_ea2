import { Component, input, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { NgxGaugeModule } from 'ngx-gauge';
import { Reading } from '../interfaces/sensors';
import { formatNumber, DatePipe } from '@angular/common';

@Component({
  selector: 'app-node',
  styleUrl: './node.css',
  templateUrl: './node.html',
  imports: [MatCardModule, NgxGaugeModule, DatePipe],
})
export class Node {
  reading = input.required<Reading>();
  formatted_temperature_value = computed(() =>
    parseFloat(formatNumber(this.reading().temperature, 'en-US', '1.1-1')),
  );
  temperature_thresholds = {
    '0': { color: 'red' },
    '10': { color: 'orange' },
    '20': { color: 'green' },
  };
  //-------------------------------------------------
  formatted_pressure_value = computed(() =>
    parseFloat(formatNumber(this.reading().pressure, 'en-US', '1.1-1')),
  );
  pressure_thresholds = {
    '0': { color: 'red' },
    '10': { color: 'orange' },
    '20': { color: 'green' },
  };
}
