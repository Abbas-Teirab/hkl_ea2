import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData, Point } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { provideNativeDateAdapter } from '@angular/material/core';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-adapter-date-fns';

@Component({
  imports: [BaseChartDirective],
  selector: 'app-line-chart',
  styleUrl: './line-chart.css',
  templateUrl: './line-chart.html',
  providers: [provideNativeDateAdapter()],
})
export class LineChart {
  title = input<string>();
  xAxisTitle = input<string>();
  viewXaxisTitle = input<boolean>(false);
  yAxisTitle = input<string>();
  color = input<string>();
  timeVector = input<string[]>([]);
  values = input<number[]>([]);

  plugins: any[] = [ChartDataLabels];
  options = computed<ChartConfiguration<'line'>['options']>(() => {
    const values = this.values();
    const max = 1.05 * Math.max(...values);
    const min = Math.min(...values) > 0 ? 0 : 1.05 * Math.min(...values);

    const op: ChartConfiguration<'line'>['options'] = {
      animation: {
        duration: 300,
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          title: {
            display: this.viewXaxisTitle(),
            text: this.xAxisTitle(),
            font: {
              size: 14,
              family: 'Poppins',
              weight: 'normal',
            },
          },
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 10,
              family: 'Poppins',
              weight: 'bold',
            },
          },
          time: {
            displayFormats: {
              second: 'HH:mm:ss',
              minute: 'HH:mm:ss',
              hour: 'ddd, HH:mm',
              day: 'DD MMM, HH:mm',
              week: 'll',
              month: 'MMM YYYY',
              quarter: 'Qo',
              year: 'YYYY',
            },
          },
        },
        y: {
          min,
          max,
          stacked: false,
          position: 'left',
          title: {
            text: this.yAxisTitle(),
            display: true,
            color: 'black',
            font: {
              size: 12,
              family: 'Poppins',
              weight: 'bold',
            },
          },
          grid: {
            display: false,
          },
          ticks: {
            // stepSize: 1,
            precision: 0,
            font: {
              size: 12,
              family: 'Poppins',
              weight: 'normal',
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
          rtl: false,
          position: 'bottom',
          align: 'start',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: {
              family: 'Poppins',
              weight: 'bold',
              size: 10,
            },
          },
        },
        datalabels: { display: false },
        tooltip: {
          titleFont: {
            family: 'almarai',
          },
          bodyFont: {
            family: 'almarai',
          },
          footerFont: {
            family: 'almarai',
          },
        },
      },
    };

    return op;
  });

  data = computed(() => {
    const points: Point[] = this.values()
      .map((value, index) => {
        const iso = this.timeVector()[index];
        const timestamp = iso ? Date.parse(iso) : NaN;
        return { x: timestamp, y: value };
      })
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    const chartObj: ChartData<'line'> = {
      datasets: [
        {
          type: 'line',
          data: points,
          backgroundColor: [this.color()],
          yAxisID: 'y',
        },
      ],
    };
    return chartObj;
  });
}
