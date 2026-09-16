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
        path: 'nodes-configuration',
        loadComponent: () =>
          import('../nodes-configuration/nodes-configuration').then((m) => m.NodesConfiguration),
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
        path: 'statistics',
        loadComponent: () => import('../statistics/statistics').then((m) => m.Statistics),
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
