import { Routes } from '@angular/router';
import { App } from './app';
import { NodesList } from './nodes-list/nodes-list';
import { SensorsReadings } from './sensors-readings/sensors-readings';
import { Main } from './main/main';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/main/sensors-readings',
    pathMatch: 'full',
  },
  {
    path: 'main',
    component: Main,
    loadChildren: () => import('./main/routes').then((r) => r.routes),
  },
];
