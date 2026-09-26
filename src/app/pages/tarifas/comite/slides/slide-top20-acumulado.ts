import { Component, computed, input } from '@angular/core';
import { ComiteDto } from '@/app/types/tarifas';
import { fmtMillones, mesAbr, mesLargo } from '../../shared/tarifas-format';
import { SlideShell } from './slide-shell';
import { RespaldoInforme, TablaInformeTop20 } from './tabla-informe-top20';

/** Pestaña 1 · Top 20 acumulado (informe gerencial acumulado). */
@Component({
    selector: 'app-slide-top20-acumulado',
    standalone: true,
    imports: [SlideShell, TablaInformeTop20],
    template: `
        <app-slide-shell [titulo]="titulo()" [pie]="'Fuente: Informe Gerencial ' + comite().encabezado.anio">
            <app-tabla-informe-top20 [filas]="comite().informeAcumulado" colorEncabezado="#22505F" [etiquetaTotal]="etiquetaTotal()" [respaldo]="respaldo()" />
        </app-slide-shell>
    `
})
export class SlideTop20Acumulado {
    comite = input.required<ComiteDto>();

    titulo = computed(() => {
        const { anio, mes } = this.comite().encabezado;
        const total = this.comite().informeAcumulado.find((f) => f.tipoFila === 'TOTAL');
        return `Top 20 clientes venta acumulada GST enero-${mesLargo(mes)} ${anio}: ${fmtMillones(total?.ventaTotal)}`;
    });

    etiquetaTotal = computed(() => {
        const { anio, mes } = this.comite().encabezado;
        return `TOTAL VENTA ACUMULADA ENE–${mesAbr(mes).toUpperCase()} ${anio}`;
    });

    /** El informe no trae TOTAL TOP 20 ni el número de clientes de OTROS: se toman de top20Clientes. */
    respaldo = computed<RespaldoInforme>(() => {
        const top20 = this.comite().top20Clientes;
        const totalTop20 = top20.find((f) => f.tipoFila === 'TOTAL_TOP20');
        const otros = top20.find((f) => f.tipoFila === 'OTROS');
        return {
            totalTop20: totalTop20 ? { venta: totalTop20.venta, pctVenta: totalTop20.pctVenta } : null,
            numOtros: otros ? otros.numClientes : null
        };
    });
}
