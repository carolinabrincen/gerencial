import { Component, computed, input } from '@angular/core';
import { ComiteDto } from '@/app/types/tarifas';
import { fmtMillones, mesLargo } from '../../shared/tarifas-format';
import { SlideShell } from './slide-shell';
import { TablaInformeTop20 } from './tabla-informe-top20';

/** Pestaña 5 · Top 20 del mes (informe gerencial mensual). */
@Component({
    selector: 'app-slide-top20-mes',
    standalone: true,
    imports: [SlideShell, TablaInformeTop20],
    template: `
        <app-slide-shell [titulo]="titulo()">
            <app-tabla-informe-top20 [filas]="comite().informeMensual" colorEncabezado="#1F2A5C" [etiquetaTotal]="etiquetaTotal()" />
        </app-slide-shell>
    `
})
export class SlideTop20Mes {
    comite = input.required<ComiteDto>();

    titulo = computed(() => {
        const { anio, mes } = this.comite().encabezado;
        const total = this.comite().informeMensual.find((f) => f.tipoFila === 'TOTAL');
        return `Top 20 clientes venta GST ${mesLargo(mes)} ${anio}: ${fmtMillones(total?.ventaTotal)}`;
    });

    etiquetaTotal = computed(() => {
        const { anio, mes } = this.comite().encabezado;
        return `VENTA TOTAL ${mesLargo(mes).toUpperCase()} ${anio}`;
    });
}
