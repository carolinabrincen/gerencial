import { Component, computed, input } from '@angular/core';
import { ComiteDto, Top20ClienteDto } from '@/app/types/tarifas';
import { etiquetaInactividad, fmtMillones, fmtPct, mesAbr } from '../../shared/tarifas-format';
import { SlideShell } from './slide-shell';

interface FilaDetalle {
    dato: Top20ClienteDto;
    clase: string;
    etiqueta: string;
    mes: string;
}

/** Pestañas 3 y 4 · Top 20 detalle (top20-clientes): parte 1 = orden 1–10, parte 2 = orden 11–20. */
@Component({
    selector: 'app-slide-top20-detalle',
    standalone: true,
    imports: [SlideShell],
    template: `
        <app-slide-shell [titulo]="titulo()" [tamanoTitulo]="26" [unaLinea]="true">
            <table class="gst-table detalle">
                <colgroup>
                    <col />
                    <col style="width: 96px" />
                    <col style="width: 84px" />
                    <col style="width: 84px" />
                    <col style="width: 96px" />
                    <col style="width: 84px" />
                    <col style="width: 88px" />
                    <col style="width: 100px" />
                    <col style="width: 100px" />
                    <col style="width: 112px" />
                    <col style="width: 96px" />
                </colgroup>
                <thead style="background: #22505f">
                    <tr>
                        <th rowspan="2">Cliente</th>
                        <th colspan="2">Venta</th>
                        <th colspan="2">Ventas con incremento</th>
                        <th colspan="4">Ventas sin incremento</th>
                        <th rowspan="2">Rutas inactivas {{ etiquetaInactivas() }}</th>
                        <th rowspan="2">Mes incremento</th>
                    </tr>
                    <tr>
                        <th>Monto ($M)</th>
                        <th>%</th>
                        <th>%</th>
                        <th>Impacto %</th>
                        <th>%</th>
                        <th>Nuevas</th>
                        <th>Cumple objetivo</th>
                        <th>No cumple objetivo</th>
                    </tr>
                </thead>
                <tbody>
                    @for (fila of filas(); track fila.dato.orden) {
                        <tr [class]="fila.clase">
                            <td class="cliente">{{ fila.etiqueta }}</td>
                            <td class="num">{{ millones(fila.dato.venta) }}</td>
                            <td class="num">{{ pct(fila.dato.pctVenta) }}</td>
                            <td class="num">{{ pct(fila.dato.pctConIncremento) }}</td>
                            <td class="num negritas">{{ pct(fila.dato.pctImpacto) }}</td>
                            <td class="num">{{ pct(fila.dato.pctSinIncremento) }}</td>
                            <td class="num">{{ pct(fila.dato.pctNuevas) }}</td>
                            <td class="num">{{ pct(fila.dato.pctCumple) }}</td>
                            <td class="num">{{ pct(fila.dato.pctNoCumple) }}</td>
                            <td class="centro" [class.inactivas-alerta]="fila.dato.rutasInactivasNoCumple > 0">{{ fila.dato.rutasInactivasTexto }}</td>
                            <td class="centro">{{ fila.mes }}</td>
                        </tr>
                    }
                </tbody>
            </table>
        </app-slide-shell>
    `,
    styles: `
        .detalle td {
            padding-top: 6px;
            padding-bottom: 6px;
            font-size: 15px;
        }
        .detalle td.cliente {
            white-space: normal;
            word-break: break-word;
        }
        .detalle .negritas {
            font-weight: 700;
        }
        .detalle .inactivas-alerta {
            color: #b03a2e;
            font-weight: 700;
        }
        .detalle tr.fila-total td.inactivas-alerta {
            color: #ffb4aa;
        }
    `
})
export class SlideTop20Detalle {
    comite = input.required<ComiteDto>();
    parte = input.required<1 | 2>();

    titulo = computed(
        () => `Top 20 Clientes — Incremento de tarifa, rutas nuevas y cumplimiento de ingreso deseado (${this.parte()} de 2)`
    );

    etiquetaInactivas = computed(() => etiquetaInactividad(this.comite().encabezado.mes));

    filas = computed<FilaDetalle[]>(() => {
        const { anio, mes } = this.comite().encabezado;
        const datos = this.comite().top20Clientes;
        const [desde, hasta] = this.parte() === 1 ? [1, 10] : [11, 20];

        const clientes = datos
            .filter((d) => d.tipoFila === 'CLIENTE' && d.orden >= desde && d.orden <= hasta)
            .sort((a, b) => a.orden - b.orden)
            .map<FilaDetalle>((d) => ({ dato: d, clase: '', etiqueta: d.cliente, mes: d.mesIncremento ?? '-' }));

        const resumen: FilaDetalle[] = [];
        const top20 = datos.find((d) => d.tipoFila === 'TOTAL_TOP20');
        if (top20) resumen.push({ dato: top20, clase: 'fila-total-top20', etiqueta: 'TOTAL TOP 20', mes: '—' });
        const otros = datos.find((d) => d.tipoFila === 'OTROS');
        if (otros) resumen.push({ dato: otros, clase: 'fila-otros', etiqueta: otros.cliente, mes: otros.mesIncremento ?? '-' });
        const total = datos.find((d) => d.tipoFila === 'TOTAL');
        if (total) {
            resumen.push({ dato: total, clase: 'fila-total', etiqueta: `TOTAL VENTA ACUMULADA ENE–${mesAbr(mes).toUpperCase()} ${anio}`, mes: '—' });
        }

        return [...clientes, ...resumen];
    });

    readonly millones = fmtMillones;
    readonly pct = fmtPct;
}
