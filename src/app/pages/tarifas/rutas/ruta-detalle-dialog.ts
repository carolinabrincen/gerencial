import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TarifasApiService } from '@/app/services/tarifas-api.service';
import { RutaDetalleDto, RutaLlave } from '@/app/types/tarifas';
import { MESES_ABR, fmtDecimal, fmtEntero, fmtFecha, fmtFechaHora, fmtMoneda, fmtPct100, mensajeError } from '../shared/tarifas-format';

interface Campo {
    etiqueta: string;
    valor: string;
}

interface TarifaMes extends Campo {
    /** null: el mes no tiene tarifa o la ruta no tiene objetivo. */
    cumple: boolean | null;
}

interface Seccion {
    titulo: string;
    campos: Campo[];
}

type ResultadoDetalle = { detalle: RutaDetalleDto; error: null } | { detalle: null; error: string };

const siNo = (v: boolean | null): string => (v === null ? '—' : v ? 'Sí' : 'No');
const texto = (v: string | null | undefined): string => (v ? v : '—');

/** Detalle de una ruta en solo lectura (GET rutas/{anio}/{idRuta}/{idClienteReclasificado}/{tipoCobro}/{kms}). */
@Component({
    selector: 'app-ruta-detalle-dialog',
    standalone: true,
    imports: [DialogModule, ProgressSpinnerModule, MessageModule],
    template: `
        <p-dialog [visible]="!!llave()" (visibleChange)="!$event && cerrar.emit()" [modal]="true" [dismissableMask]="true" [header]="titulo()" [style]="{ width: '1200px' }" [breakpoints]="{ '1280px': '95vw' }">
            @if (cargando()) {
                <div class="flex justify-center py-10">
                    <p-progress-spinner strokeWidth="4" [style]="{ width: '48px', height: '48px' }" />
                </div>
            } @else if (error(); as mensaje) {
                <p-message severity="error" [text]="mensaje" />
            } @else if (detalle(); as d) {
                <div class="flex flex-col gap-3" style="font-size: 102%">
                    @for (s of secciones(); track s.titulo) {
                        <section>
                            <div class="font-semibold text-primary mb-1">{{ s.titulo }}</div>
                            <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-2">
                                @for (c of s.campos; track c.etiqueta) {
                                    <div>
                                        <div class="text-[0.75em] text-muted-color">{{ c.etiqueta }}</div>
                                        <div class="font-medium break-words">{{ c.valor }}</div>
                                    </div>
                                }
                            </div>
                        </section>
                    }
                    <section>
                        <div class="font-semibold text-primary mb-1">Tarifa por mes</div>
                        <div class="grid grid-cols-4 md:grid-cols-12 gap-2">
                            @for (t of tarifasMes(); track t.etiqueta) {
                                <div class="text-center border rounded p-1" [class]="t.cumple === true ? 'border-green-500 bg-green-500/15' : t.cumple === false ? 'border-red-500 bg-red-500/15' : 'border-surface'">
                                    <div class="text-[0.75em] text-muted-color">{{ t.etiqueta }}</div>
                                    <div class="font-medium text-[0.875em]">{{ t.valor }}</div>
                                </div>
                            }
                        </div>
                    </section>
                    <div class="text-[0.75em] text-muted-color">Calculado el {{ fechaHora(d.fechaCalculo) }}</div>
                </div>
            }
        </p-dialog>
    `
})
export class RutaDetalleDialog {
    private api = inject(TarifasApiService);

    llave = input<RutaLlave | null>(null);
    cerrar = output<void>();

    detalle = signal<RutaDetalleDto | null>(null);
    error = signal<string | null>(null);
    cargando = signal(false);

    readonly fechaHora = fmtFechaHora;

    titulo = computed(() => {
        const d = this.detalle();
        const llave = this.llave();
        if (d) return `Ruta ${d.idRuta} · ${d.descRuta}`;
        return llave ? `Ruta ${llave.idRuta}` : 'Ruta';
    });

    secciones = computed<Seccion[]>(() => {
        const d = this.detalle();
        if (!d) return [];
        return [
            {
                titulo: 'Ruta',
                campos: [
                    { etiqueta: 'Id ruta', valor: String(d.idRuta) },
                    { etiqueta: 'Descripción', valor: d.descRuta },
                    { etiqueta: 'Kms', valor: fmtEntero(d.kms) },
                    { etiqueta: 'Año', valor: String(d.anio) },
                    { etiqueta: 'Tipo de operación', valor: d.tipoOperacion },
                    { etiqueta: 'Tipo de cobro', valor: d.tipoCobro },
                    { etiqueta: 'Categoría', valor: d.categoria },
                    { etiqueta: 'Ruta nueva', valor: siNo(d.esRutaNueva) }
                ]
            },
            {
                titulo: 'Cliente',
                campos: [
                    { etiqueta: 'Id cliente', valor: String(d.idCliente) },
                    { etiqueta: 'Cliente', valor: d.nombreCliente },
                    { etiqueta: 'Id cliente reclasificado', valor: String(d.idClienteReclasificado) },
                    { etiqueta: 'Cliente reclasificado', valor: d.nombreClienteReclasificado }
                ]
            },
            {
                titulo: 'Actividad',
                campos: [
                    { etiqueta: 'Primer viaje', valor: fmtFecha(d.fechaPrimera) },
                    { etiqueta: 'Último viaje', valor: fmtFecha(d.fechaUltima) },
                    { etiqueta: 'Núm. viajes', valor: fmtEntero(d.numViajes) },
                    { etiqueta: 'Venta', valor: fmtMoneda(d.fleteTotal) },
                    { etiqueta: 'Ventas jul–ago', valor: fmtMoneda(d.ventasJulAgo) },
                    { etiqueta: 'Inactiva jul–ago', valor: siNo(d.rutasInactivasJulAgo) }
                ]
            },
            {
                titulo: 'Incremento de tarifa',
                campos: [
                    { etiqueta: 'Tiene incremento', valor: siNo(d.tieneIncremento) },
                    { etiqueta: 'Mes incremento', valor: texto(d.mesIncremento) },
                    { etiqueta: 'Tarifa convenio actual', valor: fmtDecimal(d.tarifaConvenioActual, 0) },
                    { etiqueta: 'Tarifa inicial', valor: fmtMoneda(d.tarifaInicial) },
                    { etiqueta: 'Tarifa final', valor: fmtMoneda(d.tarifaFinal) },
                    { etiqueta: 'Diferencia de tarifa', valor: fmtDecimal(d.diferenciaTarifa) },
                    { etiqueta: '% incremento', valor: fmtPct100(d.pctIncremento) },
                    { etiqueta: 'Monto incremento', valor: fmtMoneda(d.montoIncremento) },
                    { etiqueta: 'Kms con incremento', valor: fmtEntero(d.kmsConIncremento) },
                    { etiqueta: 'Kms sin incremento', valor: fmtEntero(d.kmsSinIncremento) }
                ]
            },
            {
                titulo: 'Ingreso por kilómetro',
                campos: [
                    { etiqueta: 'Ingreso por km', valor: fmtMoneda(d.ingresoPorKm) },
                    { etiqueta: 'Objetivo por km', valor: fmtMoneda(d.objetivoIngresoKm) },
                    { etiqueta: 'Diferencia vs objetivo', valor: fmtDecimal(d.diferenciaIngresoKm) },
                    { etiqueta: 'Cumple objetivo', valor: d.cumpleObjetivo === null ? 'Sin objetivo' : siNo(d.cumpleObjetivo) }
                ]
            }
        ];
    });

    /** Un mes cumple si su tarifa supera el objetivo por km (misma regla que cumple_objetivo en SQL). */
    tarifasMes = computed<TarifaMes[]>(() => {
        const d = this.detalle();
        if (!d) return [];
        const valores = [d.tarifaEne, d.tarifaFeb, d.tarifaMar, d.tarifaAbr, d.tarifaMay, d.tarifaJun, d.tarifaJul, d.tarifaAgo, d.tarifaSep, d.tarifaOct, d.tarifaNov, d.tarifaDic];
        const objetivo = d.objetivoIngresoKm;
        return valores.map((v, i) => ({ etiqueta: MESES_ABR[i], valor: fmtMoneda(v), cumple: v === null || objetivo === null ? null : v > objetivo }));
    });

    constructor() {
        toObservable(this.llave)
            .pipe(
                tap((llave) => {
                    this.detalle.set(null);
                    this.error.set(null);
                    this.cargando.set(!!llave);
                }),
                switchMap((llave) => {
                    if (!llave) return of<ResultadoDetalle | null>(null);
                    return this.api.getRutaDetalle(llave).pipe(
                        map((detalle): ResultadoDetalle => ({ detalle, error: null })),
                        catchError((err: unknown) => of<ResultadoDetalle>({ detalle: null, error: mensajeError(err) }))
                    );
                }),
                takeUntilDestroyed()
            )
            .subscribe((resultado) => {
                this.cargando.set(false);
                if (!resultado) return;
                this.detalle.set(resultado.detalle);
                this.error.set(resultado.error);
            });
    }
}
