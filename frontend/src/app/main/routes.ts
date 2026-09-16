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
        path: 'nodes-list',
        loadComponent: () => import('../nodes-list/nodes-list').then((m) => m.NodesList),
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
    ],
  },
];
