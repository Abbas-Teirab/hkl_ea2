import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-adapter-date-fns';

@Component({
  imports: [BaseChartDirective],
  selector: 'app-bubble-chart',
  styleUrl: './bubble-chart.css',
  templateUrl: './bubble-chart.html',
})
export class BubbleChart {
  chartType: 'bubble' = 'bubble';

  title = input<string>();
  xAxisTitle = input<string>();
  minX = input<number>(0);
  maxX = input<number>(100);

  minY = input<number>(0);
  maxY = input<number>(100);
  yAxisTitle = input<string>();

  values = input<{ x: number; y: number; r: number }[]>([]);

  legends = input<string[]>([]);

  plugins: any[] = [ChartDataLabels];

  options = computed<ChartConfiguration<'bubble'>['options']>(() => {
    const op: ChartConfiguration<'bubble'>['options'] = {
      animation: {
        duration: 300,
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: this.minX(),
          max: this.maxX(),
          title: {
            display: true,
            text: this.xAxisTitle(),
            color: 'black',
            font: {
              size: 12,
              family: 'Poppins',
              weight: 'normal',
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
        y: {
          position: 'left',
          type: 'linear',
          min: this.minY(),
          max: this.maxY(),
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
          display: true,
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

  data = computed<ChartData<'bubble'>>(() => {
    const chartObj: ChartData<'bubble'> = {
      datasets: this.legends().map((legend, index) => {
        const val: ChartData<'bubble'>['datasets'][number] = {
          data: [this.values()[index]],
          label: legend,
        };
        return val;
      }),
    };

    return chartObj;
  });
}
