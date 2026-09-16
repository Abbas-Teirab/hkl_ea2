import { Routes } from '@angular/router';
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
