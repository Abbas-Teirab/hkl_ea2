import { Routes } from '@angular/router';
import { Main } from './main';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/main/sensors-readings',
    pathMatch: 'full',
  },
  {
    path: '',
    component: Main,
    children: [
      {
        path: 'settings',
        loadComponent: () => import('../settings/settings').then((m) => m.Settings),
      },
      {
        path: 'sensors-readings',
        loadComponent: () =>
          import('../sensors-readings/sensors-readings').then((m) => m.SensorsReadings),
      },
      {
        path: 'locks-triggers',
        loadComponent: () =>
          import('../locks-triggers/locks-triggers').then((m) => m.LocksTriggers),
      },
      {
        path: 'health-check',
        loadComponent: () => import('../health-check/health-check').then((m) => m.HealthCheck),
      },
      {
        path: 'statistics',
        loadComponent: () => import('../statistics/statistics').then((m) => m.Statistics),
      },
      {
        path: 'data-export',
        loadComponent: () => import('../data-export/data-export').then((m) => m.DataExport),
      },
      {
        path: 'sensors-readings/:id',
        loadComponent: () =>
          import('../sensors-readings/sensors-history-readings/sensors-history-readings').then(
            (m) => m.SensorsHistoryReadings,
          ),
      },
    ],
  },
];
