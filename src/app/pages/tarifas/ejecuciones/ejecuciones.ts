import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TarifasApiService } from '@/app/services/tarifas-api.service';
import { EjecucionDto, EstatusEjecucion } from '@/app/types/tarifas';
import { fmtDuracion, fmtFechaHora, fmtMoneda, mensajeError, mesAbr } from '../shared/tarifas-format';

const SEVERIDAD: Record<EstatusEjecucion, 'success' | 'warn' | 'danger' | 'info'> = {
    OK: 'success',
    ADVERTENCIA: 'warn',
    ERROR: 'danger',
    EN_PROCESO: 'info'
};

@Component({
    selector: 'app-tarifas-ejecuciones',
    standalone: true,
    imports: [TableModule, TagModule, ButtonModule, TooltipModule],
    template: `
        <div class="card">
            <div class="flex flex-wrap items-center gap-3 mb-4">
                <div class="font-semibold text-xl mr-auto">Ejecuciones del cálculo diario</div>
                <button pButton icon="pi pi-refresh" label="Actualizar" severity="secondary" [outlined]="true" [loading]="cargando()" (click)="cargar()"></button>
            </div>
            <p-table [value]="ejecuciones()" [loading]="cargando()" dataKey="idEjecucion" [scrollable]="true" size="small">
                <ng-template #header>
                    <tr>
                        <th style="width: 3rem"></th>
                        <th>Id</th>
                        <th>Origen</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th class="text-right">Duración</th>
                        <th>Estatus</th>
                        <th>Periodo</th>
                        <th class="text-right">Total categorías</th>
                        <th class="text-right">Total informe</th>
                        <th style="min-width: 280px">Mensaje</th>
                    </tr>
                </ng-template>
                <ng-template #body let-e let-expandido="expanded">
                    <tr>
                        <td>
                            @if (e.mensaje) {
                                <button pButton type="button" [pRowToggler]="e" [text]="true" [rounded]="true" [icon]="expandido ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" aria-label="Ver mensaje"></button>
                            }
                        </td>
                        <td>{{ e.idEjecucion }}</td>
                        <td>{{ e.origen ?? '—' }}</td>
                        <td>{{ fechaHora(e.fechaInicio) }}</td>
                        <td>{{ fechaHora(e.fechaFin) }}</td>
                        <td class="text-right">{{ duracion(e.duracionSegundos) }}</td>
                        <td><p-tag [severity]="severidad(e.estatus)" [value]="e.estatus" /></td>
                        <td>{{ periodo(e.anioFoto, e.mesFoto) }}</td>
                        <td class="text-right">{{ moneda(e.totalCategorias) }}</td>
                        <td class="text-right">{{ moneda(e.totalInforme) }}</td>
                        <td>
                            <div class="truncate max-w-md" [pTooltip]="e.mensaje ?? ''" tooltipPosition="left">{{ e.mensaje ?? '—' }}</div>
                        </td>
                    </tr>
                </ng-template>
                <ng-template #expandedrow let-e>
                    <tr>
                        <td colspan="11">
                            <pre class="whitespace-pre-wrap m-0 text-sm">{{ e.mensaje }}</pre>
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="11" class="text-center py-6">No hay ejecuciones registradas.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `
})
export class TarifasEjecuciones {
    private api = inject(TarifasApiService);
    private messageService = inject(MessageService);

    readonly fechaHora = fmtFechaHora;
    readonly duracion = fmtDuracion;
    readonly moneda = fmtMoneda;

    ejecuciones = signal<EjecucionDto[]>([]);
    cargando = signal(false);

    private carga$ = new Subject<void>();

    constructor() {
        this.carga$
            .pipe(
                tap(() => this.cargando.set(true)),
                switchMap(() =>
                    this.api.getEjecuciones(30).pipe(
                        catchError((err: unknown) => {
                            this.messageService.add({ severity: 'error', summary: 'Ejecuciones', detail: mensajeError(err) });
                            return of<EjecucionDto[]>([]);
                        })
                    )
                ),
                takeUntilDestroyed()
            )
            .subscribe((ejecuciones) => {
                this.cargando.set(false);
                this.ejecuciones.set(ejecuciones);
            });
        this.cargar();
    }

    cargar(): void {
        this.carga$.next();
    }

    severidad(estatus: EstatusEjecucion): 'success' | 'warn' | 'danger' | 'info' {
        return SEVERIDAD[estatus] ?? 'info';
    }

    periodo(anio: number | null, mes: number | null): string {
        return anio && mes ? `${mesAbr(mes)} ${anio}` : '—';
    }
}
