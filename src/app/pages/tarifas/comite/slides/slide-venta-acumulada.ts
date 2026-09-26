import { Component, computed, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { CategoriaVenta, ComiteDto, CumplimientoObjetivoDto, EstadoCumplimiento } from '@/app/types/tarifas';
import { MES_INICIO_RUTAS_NUEVAS, etiquetaInactividad, fmtEntero, fmtMillones, fmtMoneda, fmtPct, mesAbr, mesLargo } from '../../shared/tarifas-format';
import { SlideShell } from './slide-shell';

interface ResumenCategoria {
    numRutas: number;
    venta: number;
    pctVenta: number;
    pctRutas: number;
}

interface PanelCumplimiento {
    venta: number;
    numRutas: number;
    pctVenta: number;
    rutasInactivas: number;
    pctInactivas: number;
    filas: CumplimientoObjetivoDto[];
}

interface TramoBarra {
    nombre: string;
    color: string;
    pct: number;
    monto: number;
}

const PANEL_VACIO: PanelCumplimiento = { venta: 0, numRutas: 0, pctVenta: 0, rutasInactivas: 0, pctInactivas: 0, filas: [] };

/** Pestaña 2 · Venta acumulada (venta-categorias, cumplimiento-objetivo y top20-clientes). */
@Component({
    selector: 'app-slide-venta-acumulada',
    standalone: true,
    imports: [SlideShell, TooltipModule],
    template: `
        <app-slide-shell [titulo]="titulo()">
            <div class="va-tarjetas">
                <div class="va-tarjeta">
                    <div class="va-tarjeta-titulo">VENTA POR INCREMENTO DE TARIFAS</div>
                    <div class="va-tarjeta-rutas">({{ entero(incremento().numRutas) }} rutas)</div>
                    <div class="va-tarjeta-monto">{{ millones(incremento().venta) }}</div>
                    <div class="va-tarjeta-pct">{{ pct(incremento().pctVenta) }} de la venta total · {{ pct(incremento().pctRutas) }} de las rutas</div>
                    <div class="va-impacto">IMPACTO REAL: {{ millones(impacto().monto) }} · {{ pct(impacto().pct) }}</div>
                </div>
                <div class="va-tarjeta">
                    <div class="va-tarjeta-titulo">VENTAS DERIVADAS DE RUTAS NUEVAS {{ rangoNuevas() }}</div>
                    <div class="va-tarjeta-rutas">({{ entero(nuevas().numRutas) }} rutas)</div>
                    <div class="va-tarjeta-monto">{{ millones(nuevas().venta) }}</div>
                    <div class="va-tarjeta-pct">{{ pct(nuevas().pctVenta) }} de la venta total · {{ pct(nuevas().pctRutas) }} de las rutas</div>
                    <div class="va-nota" style="visibility: hidden" aria-hidden="true">&nbsp;</div>
                </div>
                <div class="va-tarjeta">
                    <div class="va-tarjeta-titulo">VENTAS SIN MODIFICACIÓN DE TARIFA</div>
                    <div class="va-tarjeta-rutas">({{ entero(sinModificacion().numRutas) }} rutas)</div>
                    <div class="va-tarjeta-monto">{{ millones(sinModificacion().venta) }}</div>
                    <div class="va-tarjeta-pct">{{ pct(sinModificacion().pctVenta) }} de la venta total · {{ pct(sinModificacion().pctRutas) }} de las rutas</div>
                    <div class="va-nota">Se divide en cumple / no cumple ingreso deseado →</div>
                </div>
            </div>

            <div class="va-subtitulo">De las rutas sin modificación, ¿cuáles cumplen el ingreso por kilómetro deseado?</div>

            <div class="va-paneles">
                @for (p of paneles(); track p.clase) {
                    <div class="va-panel" [class]="p.clase">
                        <div class="va-panel-titulo">{{ p.titulo }}</div>
                        <div class="va-panel-resumen">
                            <span class="va-panel-monto">{{ millones(p.datos.venta) }}</span>
                            <span>{{ entero(p.datos.numRutas) }} rutas · {{ pct(p.datos.pctVenta) }} de la venta total</span>
                        </div>
                        <table class="va-panel-tabla">
                            <thead>
                                <tr>
                                    <th class="izq">Tipo de Operación</th>
                                    <th>Objetivo</th>
                                    <th>Rutas</th>
                                    <th>Venta</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (f of p.datos.filas; track f.tipoOperacion) {
                                    <tr>
                                        <td class="izq">{{ f.tipoOperacion }}</td>
                                        <td>{{ p.simbolo }}{{ '$' + f.objetivoIngresoKm }}/km</td>
                                        <td>{{ entero(f.numRutas) }}</td>
                                        <td>{{ millones(f.venta) }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                        @if (p.clase === 'no-cumple') {
                            <div class="va-panel-inactivas">
                                {{ entero(p.datos.rutasInactivas) }} de estas {{ entero(p.datos.numRutas) }} ({{ pct(p.datos.pctInactivas) }}) ya no tuvieron viaje en {{ etiquetaInactivas() }}
                            </div>
                        }
                    </div>
                }
            </div>

            <div class="va-barra">
                @for (t of tramos(); track t.nombre) {
                    <div class="va-tramo" [style.width.%]="t.pct * 100" [style.background]="t.color" [pTooltip]="tooltip(t)" tooltipPosition="top">
                        @if (t.pct >= 0.035) {
                            {{ pct(t.pct) }}
                        }
                    </div>
                }
            </div>
            <div class="va-leyenda">
                @for (t of tramos(); track t.nombre) {
                    <span><i [style.background]="t.color"></i>{{ t.nombre }}</span>
                }
            </div>
        </app-slide-shell>
    `,
    styles: `
        /* Las 3 tarjetas comparten filas (subgrid) para que cada renglón quede alineado entre ellas. */
        .va-tarjetas {
            flex: 0 0 266px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: auto auto 1fr auto auto;
            column-gap: 18px;
            row-gap: 8px;
        }
        .va-tarjeta {
            grid-row: span 5;
            display: grid;
            grid-template-rows: subgrid;
            align-items: center;
            background: #e6eaf0;
            border-radius: 10px;
            padding: 16px 20px;
        }
        .va-tarjeta-titulo {
            font-size: 14.5px;
            font-weight: 700;
            color: #0f1f3d;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .va-tarjeta-rutas {
            font-size: 18px;
            color: #4b5563;
        }
        .va-tarjeta-monto {
            font-size: 44px;
            font-weight: 700;
            color: #0f1f3d;
            line-height: 1.1;
        }
        .va-tarjeta-pct {
            font-size: 17px;
            white-space: nowrap;
            color: #374151;
        }
        .va-impacto {
            margin-top: 6px;
            background: #bcd1ef;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 21px;
            font-weight: 700;
            color: #14254f;
        }
        .va-nota {
            margin-top: 6px;
            font-size: 15px;
            color: #1e63b0;
            font-weight: 600;
        }
        .va-subtitulo {
            margin: 16px 0 10px;
            font-size: 17px;
            font-weight: 700;
            color: #0f1f3d;
        }
        .va-paneles {
            flex: 1;
            min-height: 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
        }
        .va-panel {
            display: flex;
            flex-direction: column;
            border-left: 6px solid;
            border-radius: 4px;
            padding: 12px 18px;
        }
        .va-panel.cumple {
            background: #eef6ee;
            border-color: #2e7d32;
            --va-color: #2e7d32;
        }
        .va-panel.no-cumple {
            background: #fbecec;
            border-color: #b03a2e;
            --va-color: #b03a2e;
        }
        .va-panel-titulo {
            font-size: 15px;
            font-weight: 700;
            color: var(--va-color);
        }
        .va-panel-resumen {
            display: flex;
            align-items: baseline;
            gap: 12px;
            font-size: 14px;
            color: #374151;
        }
        .va-panel-monto {
            font-size: 32px;
            font-weight: 700;
            color: var(--va-color);
        }
        .va-panel-tabla {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 14px;
            font-variant-numeric: tabular-nums;
        }
        .va-panel-tabla th {
            color: var(--va-color);
            font-weight: 700;
            text-align: right;
            padding: 4px 8px;
            border-bottom: 1px solid var(--va-color);
        }
        .va-panel-tabla td {
            text-align: right;
            padding: 5px 8px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .va-panel-tabla .izq {
            text-align: left;
        }
        .va-panel-inactivas {
            margin-top: auto;
            padding-top: 8px;
            font-size: 15px;
            font-weight: 700;
            color: #b03a2e;
        }
        .va-barra {
            margin-top: 16px;
            display: flex;
            width: 100%;
            height: 38px;
            border-radius: 4px;
            overflow: hidden;
        }
        .va-tramo {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
        }
        .va-leyenda {
            display: flex;
            gap: 18px;
            margin-top: 4px;
            font-size: 11px;
            color: #374151;
        }
        .va-leyenda i {
            display: inline-block;
            width: 10px;
            height: 10px;
            margin-right: 5px;
            vertical-align: -1px;
        }
    `
})
export class SlideVentaAcumulada {
    comite = input.required<ComiteDto>();

    readonly millones = fmtMillones;
    readonly pct = fmtPct;
    readonly entero = fmtEntero;

    titulo = computed(() => {
        const { anio, mes } = this.comite().encabezado;
        const total = this.comite().ventaCategorias[0]?.ventaTotalAnio;
        return `Venta acumulada GST enero-${mesLargo(mes)} ${anio}: ${fmtMillones(total)}`;
    });

    rangoNuevas = computed(() => `${mesAbr(MES_INICIO_RUTAS_NUEVAS)}-${mesAbr(this.comite().encabezado.mes)}`.toUpperCase());

    etiquetaInactivas = computed(() => etiquetaInactividad(this.comite().encabezado.mes));

    incremento = computed(() => this.resumenCategoria('INCREMENTO_TARIFA'));
    nuevas = computed(() => this.resumenCategoria('RUTAS_NUEVAS'));
    sinModificacion = computed(() => this.resumenCategoria('SIN_MODIFICACION'));

    private totalTop20 = computed(() => this.comite().top20Clientes.find((f) => f.tipoFila === 'TOTAL'));

    impacto = computed(() => {
        const total = this.totalTop20();
        return { monto: total?.montoImpacto ?? null, pct: total?.pctImpacto ?? null };
    });

    paneles = computed(() => [
        { clase: 'cumple', titulo: 'CUMPLEN INGRESO DESEADO', simbolo: '>', datos: this.panel('CUMPLE') },
        { clase: 'no-cumple', titulo: 'NO CUMPLEN INGRESO DESEADO', simbolo: '≤', datos: this.panel('NO_CUMPLE') }
    ]);

    tramos = computed<TramoBarra[]>(() => {
        const t = this.totalTop20();
        if (!t) return [];
        const tramos: TramoBarra[] = [
            { nombre: 'Incremento', color: '#0B3A6B', pct: t.pctConIncremento, monto: t.ventaConIncremento },
            { nombre: 'Rutas nuevas', color: '#1E63B0', pct: t.pctNuevas, monto: t.ventaNuevas },
            { nombre: 'Cumple', color: '#5E9E6E', pct: t.pctCumple, monto: t.ventaCumple },
            { nombre: 'No cumple', color: '#C8693A', pct: t.pctNoCumple, monto: t.ventaNoCumple },
            { nombre: 'Sin objetivo', color: '#9E9E9E', pct: t.pctSinObjetivo, monto: t.ventaSinObjetivo }
        ];
        return tramos.filter((x) => x.pct > 0);
    });

    tooltip(t: TramoBarra): string {
        return `${t.nombre}: ${fmtMoneda(t.monto)} · ${fmtPct(t.pct)}`;
    }

    /** Suma las filas de la categoría (una por tipo de cobro); los % comparten denominador. */
    private resumenCategoria(categoria: CategoriaVenta): ResumenCategoria {
        return this.comite()
            .ventaCategorias.filter((f) => f.categoria === categoria)
            .reduce<ResumenCategoria>(
                (acc, f) => ({
                    numRutas: acc.numRutas + f.numRutas,
                    venta: acc.venta + f.venta,
                    pctVenta: acc.pctVenta + f.pctVenta,
                    pctRutas: acc.pctRutas + f.pctRutas
                }),
                { numRutas: 0, venta: 0, pctVenta: 0, pctRutas: 0 }
            );
    }

    private panel(estado: EstadoCumplimiento): PanelCumplimiento {
        const filas = this.comite()
            .cumplimientoObjetivo.filter((f) => f.categoria === 'SIN_MODIFICACION' && f.estado === estado)
            .sort((a, b) => b.venta - a.venta);
        const primera = filas[0];
        if (!primera) return PANEL_VACIO;
        return {
            venta: primera.ventaEstado,
            numRutas: primera.numRutasEstado,
            pctVenta: primera.pctVentaEstado,
            rutasInactivas: primera.rutasInactivasEstado,
            pctInactivas: primera.pctInactivasEstado,
            filas
        };
    }
}
