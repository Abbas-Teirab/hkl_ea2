import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-adapter-date-fns';
@Component({
  imports: [BaseChartDirective],
  selector: 'app-bar-chart',
  styleUrl: './bar-chart.css',
  templateUrl: './bar-chart.html',
})
export class BarChart {
  title = input<string>();
  xAxisTitle = input<string>();
  viewXaxisTitle = input<boolean>(false);
  yAxisTitle = input<string>();
  color = input<string>();
  barThickness = input<number>();
  labels = input<string[]>([]);
  values = input<number[]>([]);

  plugins: any[] = [ChartDataLabels];
  options = computed<ChartConfiguration<'bar'>['options']>(() => {
    const values = this.values();
    const max = 1.05 * Math.max(...values);
    const min = Math.min(...values) > 0 ? 0 : 1.05 * Math.min(...values);

    const op: ChartConfiguration<'bar'>['options'] = {
      animation: {
        duration: 300,
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          stacked: false,
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
    const chartObj: ChartData<'bar'> = {
      labels: this.labels(),
      datasets: [
        {
          type: 'bar',
          data: [...this.values()],
          backgroundColor: [this.color()],
          barThickness: this.barThickness(),
          yAxisID: 'y',
        },
      ],
    };
    return chartObj;
  });
}
