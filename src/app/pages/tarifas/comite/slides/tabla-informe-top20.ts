import { Component, computed, input } from '@angular/core';
import { InformeGerencialDto } from '@/app/types/tarifas';
import { fmtEntero, fmtMoneda, fmtPct } from '../../shared/tarifas-format';

/** Valores de respaldo cuando el informe no trae la fila TOTAL_TOP20 o el número de clientes de OTROS. */
export interface RespaldoInforme {
    totalTop20: { venta: number; pctVenta: number } | null;
    numOtros: number | null;
}

interface FilaResumen {
    clase: string;
    etiqueta: string;
    venta: number | null;
    pctVenta: number | null;
    numViajes: number | null;
    numRutas: number | null;
}

/** Tabla Top 20 del informe gerencial (pestañas 1 y 5). No recalcula totales: usa las filas de la API. */
@Component({
    selector: 'app-tabla-informe-top20',
    standalone: true,
    template: `
        <table class="gst-table">
            <colgroup>
                <col style="width: 96px" />
                <col />
                <col style="width: 150px" />
                <col style="width: 150px" />
                <col style="width: 90px" />
                <col style="width: 110px" />
                <col style="width: 100px" />
            </colgroup>
            <thead>
                <tr [style.background]="colorEncabezado()">
                    <th>Cliente (ID)</th>
                    <th>Cliente</th>
                    <th>Tipo de Cobro</th>
                    <th>Venta</th>
                    <th>% Venta</th>
                    <th>Núm. Viajes</th>
                    <th>Núm. Rutas</th>
                </tr>
            </thead>
            <tbody>
                @for (fila of clientes(); track fila.orden) {
                    <tr>
                        <td class="centro">{{ fila.idCliente ?? '' }}</td>
                        <td>{{ fila.nombreCliente }}</td>
                        <td>{{ fila.tipoCobro ?? '' }}</td>
                        <td class="num">{{ moneda(fila.ventaTotal) }}</td>
                        <td class="num">{{ pct(fila.pctVenta) }}</td>
                        <td class="num">{{ entero(fila.numViajes) }}</td>
                        <td class="num">{{ entero(fila.numRutas) }}</td>
                    </tr>
                }
                @for (fila of resumen(); track fila.clase) {
                    <tr [class]="fila.clase">
                        <td colspan="3">{{ fila.etiqueta }}</td>
                        <td class="num">{{ moneda(fila.venta) }}</td>
                        <td class="num">{{ pct(fila.pctVenta) }}</td>
                        <td class="num">{{ entero(fila.numViajes) }}</td>
                        <td class="num">{{ entero(fila.numRutas) }}</td>
                    </tr>
                }
            </tbody>
        </table>
    `
})
export class TablaInformeTop20 {
    filas = input.required<InformeGerencialDto[]>();
    colorEncabezado = input.required<string>();
    etiquetaTotal = input.required<string>();
    respaldo = input<RespaldoInforme>({ totalTop20: null, numOtros: null });

    readonly moneda = fmtMoneda;
    readonly pct = fmtPct;
    readonly entero = fmtEntero;

    clientes = computed(() =>
        this.filas()
            .filter((f) => f.tipoFila === 'TOP20')
            .sort((a, b) => a.orden - b.orden)
    );

    resumen = computed<FilaResumen[]>(() => {
        const filas = this.filas();
        const respaldo = this.respaldo();
        const resultado: FilaResumen[] = [];

        const top20 = filas.find((f) => f.tipoFila === 'TOTAL_TOP20');
        if (top20) {
            resultado.push(this.aResumen(top20, 'fila-total-top20', 'TOTAL TOP 20'));
        } else if (respaldo.totalTop20) {
            // top20Clientes no trae viajes ni rutas: se suman los renglones 1–20 del informe.
            const clientes = this.clientes();
            resultado.push({
                clase: 'fila-total-top20',
                etiqueta: 'TOTAL TOP 20',
                venta: respaldo.totalTop20.venta,
                pctVenta: respaldo.totalTop20.pctVenta,
                numViajes: clientes.reduce((suma, f) => suma + (f.numViajes ?? 0), 0),
                numRutas: clientes.reduce((suma, f) => suma + (f.numRutas ?? 0), 0)
            });
        }

        const otros = filas.find((f) => f.tipoFila === 'OTROS');
        if (otros) {
            const n = otros.numClientes ?? respaldo.numOtros;
            resultado.push(this.aResumen(otros, 'fila-otros', n !== null && n !== undefined ? `OTROS CLIENTES (${n})` : 'OTROS CLIENTES'));
        }

        const outliers = filas.find((f) => f.tipoFila === 'OUTLIERS');
        if (outliers && outliers.ventaTotal !== null && outliers.ventaTotal !== 0) {
            resultado.push(this.aResumen(outliers, 'fila-outliers', outliers.nombreCliente));
        }

        const total = filas.find((f) => f.tipoFila === 'TOTAL');
        if (total) {
            resultado.push(this.aResumen(total, 'fila-total', this.etiquetaTotal()));
        }

        return resultado;
    });

    private aResumen(fila: InformeGerencialDto, clase: string, etiqueta: string): FilaResumen {
        return { clase, etiqueta, venta: fila.ventaTotal, pctVenta: fila.pctVenta, numViajes: fila.numViajes, numRutas: fila.numRutas };
    }
}
