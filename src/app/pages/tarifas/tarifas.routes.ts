import { Routes } from '@angular/router';

export default [
    { path: '', redirectTo: 'comite', pathMatch: 'full' },
    { path: 'comite', data: { breadcrumb: 'Comité' }, loadComponent: () => import('./comite/comite').then((c) => c.TarifasComite) },
    { path: 'comite/:anio/:mes', data: { breadcrumb: 'Comité' }, loadComponent: () => import('./comite/comite').then((c) => c.TarifasComite) },
    { path: 'rutas', data: { breadcrumb: 'Rutas' }, loadComponent: () => import('./rutas/rutas').then((c) => c.TarifasRutas) },
    { path: 'ejecuciones', data: { breadcrumb: 'Ejecuciones' }, loadComponent: () => import('./ejecuciones/ejecuciones').then((c) => c.TarifasEjecuciones) }
] as Routes;
