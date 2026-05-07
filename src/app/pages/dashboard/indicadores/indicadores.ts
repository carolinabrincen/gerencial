import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import * as XLSX from 'xlsx';
import { GridCard, ColumnDef, KpiDef } from './grid-card';
import { KilometrosService } from '@/app/services/kilometros.service';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { dataUDN } from '@/app/types/data-udn';
import { dataOperaciones } from '@/app/types/data-operaciones';
import { dataPeriodos } from '@/app/types/data-periodos';

@Component({
    selector: 'app-dashboard-indicadores',
    standalone: true,
    imports: [GridCard, CommonModule, InputTextModule, IconFieldModule, InputIconModule, MultiSelectModule, FormsModule, ButtonModule, SelectModule, DialogModule, TableModule, ChartModule],
    template: `
        <div class="card mb-4">
            <div class="font-semibold text-xl mb-4">Indicadores</div>
            <div class="flex flex-wrap gap-3 items-end">
                <p-select
                    [options]="periodosOptions"
                    [(ngModel)]="selectedPeriodo"
                    optionLabel="periodo"
                    optionValue="periodo"
                    placeholder="Período"
                    styleClass="w-full sm:w-40"
                />
                <p-multiselect
                    [options]="udnOptions"
                    [(ngModel)]="selectedUDN"
                    optionLabel="UdN"
                    optionValue="idUdN"
                    placeholder="UDN"
                    display="chip"
                    [maxSelectedLabels]="selectedUDN.length === udnOptions.length ? 0 : udnOptions.length + 1"
                    selectedItemsLabel="TODAS LAS UDN"
                    styleClass="w-full sm:flex-1"
                />
                <p-multiselect
                    [options]="operacionesOptions"
                    [(ngModel)]="selectedOperaciones"
                    optionLabel="Operacion"
                    optionValue="idOperacion"
                    placeholder="Operación"
                    display="chip"
                    [maxSelectedLabels]="selectedOperaciones.length === operacionesOptions.length ? 0 : operacionesOptions.length + 1"
                    selectedItemsLabel="TODAS LAS OPERACIONES"
                    styleClass="w-full sm:flex-1"
                />
                <button pButton icon="pi pi-search" label="Buscar" [loading]="loading()" (click)="buscar()" class="w-full sm:w-auto"></button>
                <button pButton icon="pi pi-file-pdf" label="PDF" severity="danger" (click)="printPDF()" class="w-full sm:w-auto"></button>
            </div>
        </div>

        <div #cardsContainer class="grid grid-cols-12 gap-6">
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Viajes Cargados del periodo ' + selectedPeriodo"
                    subtitleLabel="Viaje Promedio por Operador"
                    [subtitle]="subtitleOpActivos()"
                    [trend]="trendOpActivos()"
                    [columns]="colsOpActivos"
                    [tableDataInput]="dataOpActivos()"
                    [footerRow]="footerOpActivos()"
                />
            </div>
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Kilómetros por Viaje Cargado del periodo ' + selectedPeriodo"
                    subtitleLabel="Kilómetros Cargados por Viaje"
                    [subtitle]="subtitleKmsXViaje()"
                    [trend]="trendKmsXViaje()"
                    [columns]="colsKmsXViaje"
                    [tableDataInput]="dataKmsXViaje()"
                    [footerRow]="footerKmsXViaje()"
                />
            </div>
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Kilómetros Vacíos del periodo ' + selectedPeriodo"
                    subtitleLabel="% de Kilómetros Vacíos"
                    [subtitle]="subtitleKmsVacios()"
                    [trend]="trendKmsVacios()"
                    [columns]="colsKmsVacios"
                    [tableDataInput]="dataKmsVacios()"
                    [footerRow]="footerKmsVacios()"
                />
            </div>
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Viajes Cargados por Mes del periodo ' + selectedPeriodo"
                    subtitleLabel="Viaje por Día"
                    [subtitle]="subtitleViajesMes()"
                    [trend]="trendViajesMes()"
                    [columns]="colsViajesMes"
                    [tableDataInput]="dataViajesMes()"
                    [footerRow]="footerViajesMes()"
                />
            </div>
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Disponibilidad por Mes del periodo ' + selectedPeriodo"
                    subtitleLabel="Disponibilidad Mensual"
                    [subtitle]="subtitleDisponibilidad()"
                    [trend]="trendDisponibilidad()"
                    [columns]="colsDisponibilidad"
                    [tableDataInput]="dataDisponibilidad()"
                    [footerRow]="footerDisponibilidad()"
                    actionIcon="pi pi-list"
                    actionLabel="Ver detalle"
                    (rowAction)="openDetalle($event)"
                    [compactRows]="true"
                />
            </div>

            <!-- Card 6: Kilómetros del Mes — dos tablas -->
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Kilómetros del Mes del periodo ' + selectedPeriodo"
                    [kpis]="kpisIR6()"
                    [footerOnly2]="true"
                    [columns]="colsIR6"
                    [tableDataInput]="dataIR6()"
                    [footerRow]="footerIR6()"
                    [footerRowExtra]="footerIR6Pct()"
                    [columns2]="colsIR7"
                    [tableDataInput2]="dataIR7()"
                    [footerRow2]="footerIR7()"
                    [footerRow2Extra]="footerIR7Pct()"
                />
            </div>

            <!-- Card 7: Ingreso por Viaje Cargado -->
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Ingreso por Viaje Cargado del periodo ' + selectedPeriodo"
                    subtitleLabel="Ingreso por Viaje Cargado"
                    [subtitle]="subtitleIR8()"
                    [trend]="trendIR8()"
                    [columns]="colsIR8"
                    [tableDataInput]="dataIR8WithPct()"
                    [footerRow]="footerIR8()"
                />
            </div>

            <!-- Card 8: Ingreso por Unidad -->
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Ingreso por Unidad del periodo ' + selectedPeriodo"
                    subtitleLabel="Ingreso por Unidad"
                    [subtitle]="subtitleIR9()"
                    [trend]="trendIR9()"
                    [columns]="colsIR9"
                    [tableDataInput]="dataIR9()"
                    [footerRow]="footerIR9()"
                />
            </div>

            <!-- Card 9: Ingreso por Km -->
            <div class="col-span-12 md:col-span-6 mb-8">
                <app-grid-card
                    [title]="'Ingreso por Km del periodo ' + selectedPeriodo"
                    subtitleLabel="Ingreso por Kilómetro"
                    [subtitle]="subtitleIR10()"
                    [trend]="trendIR10()"
                    [columns]="colsIR10"
                    [tableDataInput]="dataIR10()"
                    [footerRow]="footerIR10()"
                />
            </div>
        </div>

        <p-dialog
            [(visible)]="dialogVisible"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [style]="dialogStyle"
            [header]="'Detalle Disponibilidad — ' + (selectedDisponibilidadRow?.mes ?? '')"
        >
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12" *ngIf="chartDataDetalle">
                    
                    <p-chart type="line" [data]="chartDataDetalle" [options]="chartOptionsDetalle" [plugins]="chartPluginsDetalle" height="220px" />
                </div>
                <div class="col-span-12">
                    <div class="flex items-center justify-between mb-2">
                        <div class="font-semibold text-base">Detalle Mensual</div>
                        <button pButton icon="pi pi-file-excel" size="small" severity="success" [text]="true" (click)="exportDetalleMensual()" title="Exportar Excel"></button>
                    </div>
                    <div class="overflow-x-auto">
                    <p-table
                        [value]="selectedDisponibilidadRow?.detalleMensual ?? []"
                        [tableStyle]="{ 'font-size': '0.875rem' }"
                        styleClass="p-datatable-sm"
                    >
                        <ng-template #header>
                            <tr>
                                <th *ngFor="let col of colsDetalleMensual" [style.font-size]="isDayCol(col) ? '0.75rem' : null" style="white-space:nowrap; text-align:center">{{ col.header }}</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td *ngFor="let col of colsDetalleMensual" [style.font-size]="isDayCol(col) ? '0.75rem' : null" style="text-align:center">{{ row[col.field] ?? '' }}</td>
                            </tr>
                        </ng-template>
                        <ng-template #footer>
                            <tr *ngIf="porcentajeDetalleMensual" style="background:var(--p-surface-50); font-weight:600">
                                <td *ngFor="let col of colsDetalleMensual" [style.font-size]="isDayCol(col) ? '0.75rem' : null" style="text-align:center">{{ porcentajeDetalleMensual![col.field] ?? '' }}</td>
                            </tr>
                            <tr *ngFor="let abRow of (selectedDisponibilidadRow?.altasBajas ?? [])">
                                <td *ngFor="let col of colsDetalleMensual"
                                    [style.font-size]="abCellFontSize(abRow, col)"
                                    [style.color]="abCellColor(abRow, col)"
                                    [style.font-weight]="abCellWeight(abRow, col)"
                                    style="text-align:center">{{ abRow[col.field] ?? '' }}</td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr><td [attr.colspan]="colsDetalleMensual.length || 1" class="text-center text-surface-400 py-6">Sin datos</td></tr>
                        </ng-template>
                    </p-table>
                    </div>
                </div>
            </div>
        </p-dialog>
    `
})
export class DashboardIndicadores implements OnInit {
    @ViewChild('cardsContainer') cardsContainer!: ElementRef<HTMLElement>;

    periodosOptions = dataPeriodos;
    selectedPeriodo: string = '';

    udnOptions = dataUDN;
    selectedUDN: number[] = [];

    operacionesOptions = dataOperaciones;
    selectedOperaciones: number[] = [];

    menubarItems: any[] = [];
    private kilometrosService = inject(KilometrosService);

    loading = signal(false);

    dialogVisible = false;
    selectedDisponibilidadRow: any = null;

    private toColHeader(key: string): string {
        const dayMatch = key.match(/^dia(\d+)$/i);
        if (dayMatch) return dayMatch[1];
        if (/^clasificacion$/i.test(key)) return 'Días';
        if (/^total$/i.test(key)) return 'Mes';
        return key;
    }

    isDayCol(col: ColumnDef): boolean {
        return /^dia\d+$/i.test(col.field);
    }

    abCellColor(row: any, col: ColumnDef): string | null {
        const tipo = String(row[Object.keys(row)[0]] ?? '').toLowerCase();
        const val  = Number(row[col.field]);
        if (isNaN(val) || val <= 0) return null;
        if (tipo === 'altas') return '#16a34a';
        if (tipo === 'bajas') return '#dc2626';
        return null;
    }

    abCellWeight(row: any, col: ColumnDef): string | null {
        const tipo = String(row[Object.keys(row)[0]] ?? '').toLowerCase();
        const val  = Number(row[col.field]);
        return (tipo === 'altas' || tipo === 'bajas') && !isNaN(val) && val > 0 ? '600' : null;
    }

    abCellFontSize(row: any, col: ColumnDef): string {
        const tipo = String(row[Object.keys(row)[0]] ?? '').toLowerCase();
        const val  = Number(row[col.field]);
        const highlighted = (tipo === 'altas' || tipo === 'bajas') && !isNaN(val) && val > 0;
        if (this.isDayCol(col)) return highlighted ? 'calc(0.75rem + 1pt)' : '0.75rem';
        return highlighted ? 'calc(0.875rem + 1pt)' : '0.875rem';
    }

    get porcentajeDetalleMensual(): Record<string, any> | null {
        const data = this.selectedDisponibilidadRow?.detalleMensual;
        if (!data?.length) return null;
        const keys = Object.keys(data[0]);
        const firstKey = keys[0];
        const activosRow   = data.find((r: any) => String(r[firstKey]).toLowerCase() === 'activos');
        const plantillaRow = data.find((r: any) => String(r[firstKey]).toLowerCase() === 'plantilla');
        if (!activosRow || !plantillaRow) return null;
        const result: Record<string, any> = {};
        keys.forEach((key, i) => {
            if (i === 0) {
                result[key] = '% Disp.';
            } else {
                const activos   = Number(activosRow[key])   || 0;
                const plantilla = Number(plantillaRow[key]) || 0;
                result[key] = plantilla > 0 ? Math.round((activos / plantilla) * 100) + '%' : '0%';
            }
        });
        return result;
    }

    get footerDetalleMensual(): Record<string, any> {
        const data = this.selectedDisponibilidadRow?.detalleMensual;
        if (!data?.length) return {};
        const keys = Object.keys(data[0]);
        const result: Record<string, any> = {};
        keys.forEach((key, i) => {
            const nums = data.map((r: any) => Number(r[key])).filter((v: number) => !isNaN(v));
            result[key] = nums.length === data.length ? nums.reduce((s: number, v: number) => s + v, 0) : (i === 0 ? 'Total' : '');
        });
        return result;
    }

    get sharedDialogColWidth(): string {
        const n = Math.max(this.colsDetalleMensual.length, this.colsAltasBajas.length, 1);
        return Math.max(55, Math.floor(980 / n)) + 'px';
    }

    get dialogStyle(): Record<string, string> {
        return { width: Math.floor(window.innerWidth * 0.97) + 'px' };
    }

    get colsDetalleMensual(): ColumnDef[] {
        const data = this.selectedDisponibilidadRow?.detalleMensual;
        if (!data?.length) return [];
        const keys = Object.keys(data[0]);
        const firstKey = keys[0];
        const plantillaRow = data.find((r: any) => String(r[firstKey]).toLowerCase() === 'plantilla');
        return keys
            .filter(key => key === firstKey || !plantillaRow || (Number(plantillaRow[key]) || 0) > 0)
            .map(key => ({ field: key, header: this.toColHeader(key) }));
    }

    get colsAltasBajas(): ColumnDef[] {
        const data = this.selectedDisponibilidadRow?.altasBajas;
        if (!data?.length) return [];
        return Object.keys(data[0]).map(key => ({ field: key, header: this.toColHeader(key) }));
    }

    chartDataDetalle: any = null;

    private buildChartData(row: any): any {
        const data = row?.detalleMensual;
        if (!data?.length) return null;
        const keys = Object.keys(data[0]);
        const firstKey = keys[0];
        const activosRow   = data.find((r: any) => String(r[firstKey]).toLowerCase() === 'activos');
        const plantillaRow = data.find((r: any) => String(r[firstKey]).toLowerCase() === 'plantilla');
        if (!activosRow || !plantillaRow) return null;
        const dayKeys = keys.filter(k => /^dia\d+$/i.test(k) && (Number(plantillaRow[k]) || 0) > 0);
        if (!dayKeys.length) return null;
        const labels = dayKeys.map(k => k.replace(/^dia/i, ''));
        const values = dayKeys.map(key => {
            const activos   = Number(activosRow[key])   || 0;
            const plantilla = Number(plantillaRow[key]) || 0;
            return Math.round((activos / plantilla) * 100);
        });
        return {
            labels,
            datasets: [{
                label: '% Disp.',
                data: values,
                fill: true,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59,130,246,0.15)',
                pointBackgroundColor: '#3B82F6',
                tension: 0.4
            }]
        };
    }

    chartOptionsDetalle = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20 } },
        plugins: {
            legend: { display: false },
            title: { display: true, text: '% de Disponibilidad por Día', font: { size: 14 } }
        },
        scales: {
            x: { title: { display: true, text: 'Día' } },
            y: { title: { display: true, text: '% Disp.' }, beginAtZero: true }
        }
    };

    chartPluginsDetalle = [{
        id: 'pointLabels',
        afterDatasetsDraw(chart: any) {
            const ctx: CanvasRenderingContext2D = chart.ctx;
            chart.data.datasets.forEach((dataset: any, i: number) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((point: any, index: number) => {
                    const val = dataset.data[index];
                    if (val === null || val === undefined) return;
                    ctx.save();
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillStyle = '#1d4ed8';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(val + '%', point.x, point.y - 4);
                    ctx.restore();
                });
            });
        }
    }];

    exportDetalleMensual(): void {
        const cols = this.colsDetalleMensual;
        const data = this.selectedDisponibilidadRow?.detalleMensual ?? [];
        const pct  = this.porcentajeDetalleMensual;
        const ab   = this.selectedDisponibilidadRow?.altasBajas ?? [];

        const header = cols.map(c => c.header);
        const toRow  = (r: any) => cols.map(c => r[c.field] ?? '');

        const rows = [
            header,
            ...data.map(toRow),
            ...(pct ? [toRow(pct)] : []),
            ...ab.map(toRow),
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
        const mes = this.selectedDisponibilidadRow?.mes ?? 'Detalle';
        XLSX.writeFile(wb, `Disponibilidad_${mes}_${this.selectedPeriodo}.xlsx`);
    }

    private mesAbrev(periodoYYYYMM: string): string {
        const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        const month = parseInt(periodoYYYYMM.substring(4, 6), 10);
        const prevMonth = month === 1 ? 12 : month - 1;
        return meses[prevMonth - 1] ?? '';
    }

    openDetalle(row: any): void {
        this.selectedDisponibilidadRow = row;
        this.chartDataDetalle = this.buildChartData(row);
        this.dialogVisible = true;
    }

    dataOpActivos = signal<any[]>([]);
    dataKmsXViaje = signal<any[]>([]);
    dataKmsVacios = signal<any[]>([]);
    dataViajesMes = signal<any[]>([]);
    dataDisponibilidad = signal<any[]>([]);
    dataIR6 = signal<any[]>([]);
    dataIR7 = signal<any[]>([]);
    dataIR8 = signal<any[]>([]);
    dataIR9 = signal<any[]>([]);
    dataIR10 = signal<any[]>([]);

    colsIR6: ColumnDef[] = [
        { field: 'udN',        header: 'UDN' },
        { field: 'de0a500',    header: '0 – 500',     format: 'integer', align: 'center' },
        { field: 'de501a1500', header: '501 – 1,500', format: 'integer', align: 'center' },
        { field: 'mas1501',    header: '+ 1,500',     format: 'integer', align: 'center' },
    ];

    colsIR7: ColumnDef[] = [
        { field: 'udN',        header: 'UDN' },
        { field: 'de0a500',    header: '0 – 500',     format: 'integer', align: 'center' },
        { field: 'de501a1500', header: '501 – 1,500', format: 'integer', align: 'center' },
        { field: 'mas1501',    header: '+ 1,500',     format: 'integer', align: 'center' },
    ];

    colsIR8: ColumnDef[] = [
        { field: 'udN',            header: 'UDN' },
        { field: 'ingreso',        header: 'Ingreso',         format: 'currency-int' },
        { field: 'viajesCargados', header: 'Viajes Cargados', format: 'integer', align: 'center' },
        { field: 'ingrXViaje',     header: 'Ingr. x Viaje',  format: 'currency-int' },
        { field: 'mesAnt',         header: 'Mes Ant.',        format: 'currency-int' },
        { field: 'pctIngreso',     header: '% Ingreso',       format: 'percent-int', align: 'right' },
    ];

    colsIR9: ColumnDef[] = [
        { field: 'udN',         header: 'UDN' },
        { field: 'ingreso',     header: 'Ingreso',         format: 'currency-int' },
        { field: 'operadores',  header: 'Operadores',      format: 'integer', align: 'right' },
        { field: 'ingrXUnidad', header: 'Ingr. x Unidad', format: 'currency-int' },
        { field: 'mesAnt',      header: 'Mes Ant.',        format: 'currency-int' },
    ];

    colsIR10: ColumnDef[] = [
        { field: 'udN',        header: 'UDN' },
        { field: 'ingreso',    header: 'Ingreso',     format: 'currency-int' },
        { field: 'kmsTotales', header: 'Kms Totales', format: 'integer',      align: 'right' },
        { field: 'ingrXKm',    header: 'Ingr. x Km',  format: 'currency-dec1', align: 'right' },
        { field: 'mesAnt',     header: 'Mes Ant.',     format: 'currency-dec1', align: 'right' },
    ];

    footerIR6 = computed(() => {
        const data = this.dataIR6();
        if (!data.length) return null;
        const s0    = data.reduce((s: number, r: any) => s + (r.de0a500    ?? 0), 0);
        const s501  = data.reduce((s: number, r: any) => s + (r.de501a1500 ?? 0), 0);
        const s1501 = data.reduce((s: number, r: any) => s + (r.mas1501    ?? 0), 0);
        const total = s0 + s501 + s1501;
        return { udN: total.toLocaleString('es-MX'), de0a500: s0, de501a1500: s501, mas1501: s1501 };
    });

    footerIR6Pct = computed(() => {
        const f = this.footerIR6();
        if (!f) return null;
        const total = (f.de0a500 as number) + (f.de501a1500 as number) + (f.mas1501 as number);
        if (total === 0) return null;
        const pct = (v: number) => Math.round(v / total * 100) + '%';
        return {
            udN: '',
            de0a500:    pct(f.de0a500    as number),
            de501a1500: pct(f.de501a1500 as number),
            mas1501:    pct(f.mas1501    as number),
        };
    });

    footerIR7 = computed(() => {
        const data = this.dataIR7();
        if (!data.length) return null;
        const s0    = data.reduce((s: number, r: any) => s + (r.de0a500    ?? 0), 0);
        const s501  = data.reduce((s: number, r: any) => s + (r.de501a1500 ?? 0), 0);
        const s1501 = data.reduce((s: number, r: any) => s + (r.mas1501    ?? 0), 0);
        const total = s0 + s501 + s1501;
        return { udN: total.toLocaleString('es-MX'), de0a500: s0, de501a1500: s501, mas1501: s1501 };
    });

    footerIR7Pct = computed(() => {
        const f = this.footerIR7();
        if (!f) return null;
        const total = (f.de0a500 as number) + (f.de501a1500 as number) + (f.mas1501 as number);
        if (total === 0) return null;
        const pct = (v: number) => Math.round(v / total * 100) + '%';
        return {
            udN: this.mesAbrev(this.selectedPeriodo),
            de0a500:    pct(f.de0a500    as number),
            de501a1500: pct(f.de501a1500 as number),
            mas1501:    pct(f.mas1501    as number),
        };
    });

    kpisIR6 = computed((): KpiDef[] => {
        const f6 = this.footerIR6();
        const f7 = this.footerIR7();
        const fmt = (v: number) => Math.floor(v).toLocaleString('es-MX');
        const v6 = { a: f6 ? (f6.de0a500 as number) : 0, b: f6 ? (f6.de501a1500 as number) : 0, c: f6 ? (f6.mas1501 as number) : 0 };
        const v7 = { a: f7 ? (f7.de0a500 as number) : 0, b: f7 ? (f7.de501a1500 as number) : 0, c: f7 ? (f7.mas1501 as number) : 0 };
        const t6 = v6.a + v6.b + v6.c;
        const t7 = v7.a + v7.b + v7.c;
        const p6 = { a: t6 > 0 ? v6.a / t6 : 0, b: t6 > 0 ? v6.b / t6 : 0, c: t6 > 0 ? v6.c / t6 : 0 };
        const p7 = { a: t7 > 0 ? v7.a / t7 : 0, b: t7 > 0 ? v7.b / t7 : 0, c: t7 > 0 ? v7.c / t7 : 0 };
        const trend = (a: number, b: number): 'up' | 'down' | '' => f6 && f7 ? (a > b ? 'up' : 'down') : '';
        return [
            { label: '0 a 500',     value: f6 ? fmt(v6.a) : '—', trend: trend(p6.a, p7.a) },
            { label: '501 a 1,500', value: f6 ? fmt(v6.b) : '—', trend: trend(p6.b, p7.b) },
            { label: '+ 1,500',     value: f6 ? fmt(v6.c) : '—', trend: trend(p6.c, p7.c) },
        ];
    });

    footerIR8 = computed(() => {
        const data = this.dataIR8();
        if (!data.length) return null;
        const totalIngreso          = data.reduce((s: number, r: any) => s + (r.ingreso               ?? 0), 0);
        const totalViajes           = data.reduce((s: number, r: any) => s + (r.viajesCargados        ?? 0), 0);
        const totalMesAntIngreso    = data.reduce((s: number, r: any) => s + (r.mesAntIngreso         ?? 0), 0);
        const totalMesAntViajes     = data.reduce((s: number, r: any) => s + (r.mesAntViajesCargados  ?? 0), 0);
        const mesAnt = totalMesAntViajes > 0 ? totalMesAntIngreso / totalMesAntViajes : 0;
        return {
            udN: 'Total',
            ingreso:        totalIngreso,
            viajesCargados: totalViajes,
            ingrXViaje:     totalViajes > 0 ? totalIngreso / totalViajes : 0,
            mesAnt,
            pctIngreso:     1,
        };
    });

    dataIR8WithPct = computed(() => {
        const data = this.dataIR8();
        const total = data.reduce((s: number, r: any) => s + (r.ingreso ?? 0), 0);
        if (total === 0) return data;
        return data.map((r: any) => ({ ...r, pctIngreso: (r.ingreso ?? 0) / total }));
    });

    footerIR9 = computed(() => {
        const data = this.dataIR9();
        if (!data.length) return null;
        const totalIngreso          = data.reduce((s: number, r: any) => s + (r.ingreso          ?? 0), 0);
        const totalOperadores       = data.reduce((s: number, r: any) => s + (r.operadores       ?? 0), 0);
        const totalMesAntIngreso    = data.reduce((s: number, r: any) => s + (r.mesAntIngreso    ?? 0), 0);
        const totalMesAntOperadores = data.reduce((s: number, r: any) => s + (r.mesAntOperadores ?? 0), 0);
        const mesAnt = totalMesAntOperadores > 0 ? totalMesAntIngreso / totalMesAntOperadores : 0;
        return {
            udN: 'Total',
            ingreso:     totalIngreso,
            operadores:  totalOperadores,
            ingrXUnidad: totalOperadores > 0 ? totalIngreso / totalOperadores : 0,
            mesAnt,
        };
    });

    footerIR10 = computed(() => {
        const data = this.dataIR10();
        if (!data.length) return null;
        const totalIngreso          = data.reduce((s: number, r: any) => s + (r.ingreso          ?? 0), 0);
        const totalKms              = data.reduce((s: number, r: any) => s + (r.kmsTotales       ?? 0), 0);
        const totalMesAntIngreso    = data.reduce((s: number, r: any) => s + (r.mesAntIngreso    ?? 0), 0);
        const totalMesAntKms        = data.reduce((s: number, r: any) => s + (r.mesAntKmsTotales ?? 0), 0);
        const mesAnt = totalMesAntKms > 0 ? totalMesAntIngreso / totalMesAntKms : 0;
        return {
            udN: 'Total',
            ingreso:    totalIngreso,
            kmsTotales: totalKms,
            ingrXKm:    totalKms > 0 ? totalIngreso / totalKms : 0,
            mesAnt,
        };
    });

    subtitleIR8 = computed(() => {
        const f = this.footerIR8();
        if (!f) return '';
        return '$' + Math.round(f.ingrXViaje as number).toLocaleString('es-MX');
    });

    trendIR8 = computed((): 'up' | 'down' | '' => {
        const f = this.footerIR8();
        if (!f) return '';
        return (f.ingrXViaje as number) > (f.mesAnt as number) ? 'up' : 'down';
    });

    subtitleIR10 = computed(() => {
        const f = this.footerIR10();
        if (!f) return '';
        return '$' + (f.ingrXKm as number).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    });

    trendIR10 = computed((): 'up' | 'down' | '' => {
        const f = this.footerIR10();
        if (!f) return '';
        return (f.ingrXKm as number) > (f.mesAnt as number) ? 'up' : 'down';
    });

    subtitleIR9 = computed(() => {
        const f = this.footerIR9();
        if (!f) return '';
        return '$' + Math.round(f.ingrXUnidad as number).toLocaleString('es-MX');
    });

    trendIR9 = computed((): 'up' | 'down' | '' => {
        const f = this.footerIR9();
        if (!f) return '';
        return (f.ingrXUnidad as number) > (f.mesAnt as number) ? 'up' : 'down';
    });

    subtitleViajesMes = computed(() => {
        const footer = this.footerViajesMes();
        if (!footer) return '';
        return Number(footer.viajesXDia).toFixed(2);
    });

    trendViajesMes = computed((): 'up' | 'down' | '' => {
        const data = this.dataViajesMes();
        if (data.length < 2) return '';
        const last       = data[data.length - 1]?.viajesXDia ?? 0;
        const secondLast = data[data.length - 2]?.viajesXDia ?? 0;
        return last > secondLast ? 'up' : 'down';
    });

    subtitleKmsVacios = computed(() => {
        const footer = this.footerKmsVacios();
        if (!footer) return '';
        return (Number(footer.kmsVacios) * 100).toFixed(1) + '%';
    });

    trendKmsVacios = computed((): 'up' | 'down' | '' => {
        const footer = this.footerKmsVacios();
        if (!footer) return '';
        return footer.kmsVacios < footer.mesAnt ? 'up' : 'down';
    });

    subtitleKmsXViaje = computed(() => {
        const footer = this.footerKmsXViaje();
        if (!footer) return '';
        return Number(footer.kmsXViaje).toFixed(0);
    });

    trendKmsXViaje = computed((): 'up' | 'down' | '' => {
        const footer = this.footerKmsXViaje();
        if (!footer) return '';
        return footer.kmsXViaje > footer.mesAnt ? 'up' : 'down';
    });

    trendOpActivos = computed((): 'up' | 'down' | '' => {
        const footer = this.footerOpActivos();
        if (!footer) return '';
        return footer.vjesPromOp > footer.mesAnt ? 'up' : 'down';
    });

    subtitleOpActivos = computed(() => {
        const data = this.dataOpActivos();
        if (!data.length) return '';
        const totalViajes     = data.reduce((s: number, r: any) => s + (r.viajesCargados ?? 0), 0);
        const totalOperadores = data.reduce((s: number, r: any) => s + (r.operadores     ?? 0), 0);
        return totalOperadores > 0 ? (totalViajes / totalOperadores).toFixed(2) : '0.00';
    });

    footerDisponibilidad = computed(() => {
        const data = this.dataDisponibilidad();
        if (!data.length) return null;
        const promOperadores  = data.reduce((s: number, r: any) => s + (r.operadores  ?? 0), 0) / data.length;
        const promDisponibles = data.reduce((s: number, r: any) => s + (r.disponibles ?? 0), 0) / data.length;
        const disponibilidad  = promOperadores > 0 ? promDisponibles / promOperadores : 0;
        return { mes: 'Total', operadores: promOperadores, disponibles: promDisponibles, disponibilidad };
    });

    trendDisponibilidad = computed((): 'up' | 'down' | '' => {
        const data = this.dataDisponibilidad();
        if (data.length < 2) return '';
        const last       = data[data.length - 1]?.disponibilidad ?? 0;
        const secondLast = data[data.length - 2]?.disponibilidad ?? 0;
        return last > secondLast ? 'up' : 'down';
    });

    subtitleDisponibilidad = computed(() => {
        const footer = this.footerDisponibilidad();
        if (!footer) return '';
        return (footer.disponibilidad * 100).toFixed(1) + '%';
    });

    footerViajesMes = computed(() => {
        const data = this.dataViajesMes();
        if (!data.length) return null;
        const promViajes = data.reduce((s: number, r: any) => s + (r.viajesCargados ?? 0), 0) / data.length;
        const promDias   = data.reduce((s: number, r: any) => s + (r.diasHabiles    ?? 0), 0) / data.length;
        const viajesXDia = promDias > 0 ? promViajes / promDias : 0;
        return { mes: 'Total', viajesCargados: promViajes, diasHabiles: promDias, viajesXDia };
    });

    footerKmsVacios = computed(() => {
        const data = this.dataKmsVacios();
        if (!data.length) return null;
        const totalKmsTotales   = data.reduce((s: number, r: any) => s + (r.kmsTotales  ?? 0), 0);
        const totalKmsCargados  = data.reduce((s: number, r: any) => s + (r.kmsCargados ?? 0), 0);
        const kmsVacios              = totalKmsTotales > 0 ? (totalKmsTotales - totalKmsCargados) / totalKmsTotales : 0;
        const totalMesAntKmsTotales  = data.reduce((s: number, r: any) => s + (r.mesAntKmsTotales  ?? 0), 0);
        const totalMesAntKmsCargados = data.reduce((s: number, r: any) => s + (r.mesAntKmsCargados ?? 0), 0);
        const mesAnt = totalMesAntKmsTotales > 0 ? (totalMesAntKmsTotales - totalMesAntKmsCargados) / totalMesAntKmsTotales : 0;
        return { udn: 'Total', kmsTotales: totalKmsTotales, kmsCargados: totalKmsCargados, kmsVacios, mesAnt };
    });

    footerKmsXViaje = computed(() => {
        const data = this.dataKmsXViaje();
        if (!data.length) return null;
        const totalKmsCargados = data.reduce((s: number, r: any) => s + (r.kmsCargados    ?? 0), 0);
        const totalViajes      = data.reduce((s: number, r: any) => s + (r.viajesCargados ?? 0), 0);
        const kmsXViaje             = totalViajes > 0 ? totalKmsCargados / totalViajes : 0;
        const totalMesAntKms        = data.reduce((s: number, r: any) => s + (r.mesAntKmsCargados      ?? 0), 0);
        const totalMesAntViajes     = data.reduce((s: number, r: any) => s + (r.mesAntViajesCargados   ?? 0), 0);
        const mesAnt = totalMesAntViajes > 0 ? totalMesAntKms / totalMesAntViajes : 0;
        return { udn: 'Total', kmsCargados: totalKmsCargados, viajesCargados: totalViajes, kmsXViaje, mesAnt };
    });

    footerOpActivos = computed(() => {
        const data = this.dataOpActivos();
        if (!data.length) return null;
        const totalViajes = data.reduce((s: number, r: any) => s + (r.viajesCargados ?? 0), 0);
        const totalOperadores = data.reduce((s: number, r: any) => s + (r.operadores ?? 0), 0);
        const promXOp = totalOperadores > 0 ? totalViajes / totalOperadores : 0;
        const totalMesAntViajes = data.reduce((s: number, r: any) => s + (r.mesAntViajes      ?? 0), 0);
        const totalMesAntOps    = data.reduce((s: number, r: any) => s + (r.mesAntOperadores  ?? 0), 0);
        const mesAnt = totalMesAntOps > 0 ? totalMesAntViajes / totalMesAntOps : 0;
        return { udn: 'Total', viajesCargados: totalViajes, operadores: totalOperadores, vjesPromOp: promXOp, mesAnt };
    });

    colsOpActivos: ColumnDef[] = [
        { field: 'udn',            header: 'UDN' },
        { field: 'viajesCargados', header: 'Viajes Cargados', format: 'integer', align: 'center' },
        { field: 'operadores',     header: 'Operadores',      format: 'integer', align: 'center' },
        { field: 'vjesPromOp',     header: 'Prom. X Op.',     format: 'decimal', align: 'right' },
        { field: 'mesAnt',         header: 'Mes Ant.',        format: 'decimal', align: 'right' },
    ];

    colsKmsXViaje: ColumnDef[] = [
        { field: 'udn',            header: 'UDN' },
        { field: 'kmsCargados',    header: 'Kms Cargados',    format: 'integer', align: 'right' },
        { field: 'viajesCargados', header: 'Viajes Cargados', format: 'integer', align: 'right' },
        { field: 'kmsXViaje',      header: 'Kms X Viaje',     format: 'integer', align: 'right' },
        { field: 'mesAnt',         header: 'Mes Ant.',        format: 'integer', align: 'right' },
    ];

    colsKmsVacios: ColumnDef[] = [
        { field: 'udn',         header: 'UDN' },
        { field: 'kmsTotales',  header: 'Kms Totales',  format: 'integer', align: 'right' },
        { field: 'kmsCargados', header: 'Kms Cargados', format: 'integer', align: 'right' },
        { field: 'kmsVacios',   header: 'Kms Vacíos %', format: 'percent', align: 'right' },
        { field: 'mesAnt',      header: 'Mes Ant. %',   format: 'percent', align: 'right' },
    ];

    colsViajesMes: ColumnDef[] = [
        { field: 'mes',            header: 'Mes' },
        { field: 'viajesCargados', header: 'Viajes Cargados', format: 'integer', align: 'right' },
        { field: 'diasHabiles',    header: 'Días Hábiles',    format: 'integer', align: 'right' },
        { field: 'viajesXDia',     header: 'Viajes X Día',    format: 'decimal', align: 'right' },
    ];

    colsDisponibilidad: ColumnDef[] = [
        { field: 'mes',            header: 'Mes' },
        { field: 'operadores',     header: 'Operadores',       format: 'integer', align: 'right' },
        { field: 'disponibles',    header: 'Disponibles',      format: 'integer', align: 'right' },
        { field: 'disponibilidad', header: 'Disponibilidad %', format: 'percent', align: 'right' },
    ];

    ngOnInit() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        this.selectedPeriodo = `${year}${month}`;

        this.selectedUDN = this.udnOptions.map(u => u.idUdN);
        this.selectedOperaciones = this.operacionesOptions.map(o => o.idOperacion);
    }

    buscar(): void {

         this.dataOpActivos.set([]);
                    this.dataKmsXViaje.set([]);
                    this.dataKmsVacios.set([]);
                    this.dataViajesMes.set([]);
                    this.dataDisponibilidad.set([]);
                    this.dataIR6.set([]);
                    this.dataIR7.set([]);
                    this.dataIR8.set([]);
                    this.dataIR9.set([]);
                    this.dataIR10.set([]);
    

        const udnNames = this.selectedUDN
            .map(id => this.udnOptions.find(u => u.idUdN === id)?.UdN ?? '')
            .filter(name => name !== '');

        const operacionNames = this.selectedOperaciones
            .map(id => this.operacionesOptions.find(o => o.idOperacion === id)?.Operacion ?? '')
            .filter(name => name !== '');

        const body = {
            periodo: Number(this.selectedPeriodo),
            udn: udnNames,
            operacion: operacionNames
        };

        console.log('[Indicadores] Request body:', JSON.stringify(body, null, 2));

        this.loading.set(true);
        this.kilometrosService.getIndicadoresResumen(body).pipe(
            finalize(() => this.loading.set(false))
        ).subscribe({
            next: (response) => {
                console.log('[Indicadores] Response:', response);
                if (response.responseCode === 200 && response.data) {
                    this.dataOpActivos.set(response.data.iR1OpActivos ?? []);
                    this.dataKmsXViaje.set(response.data.iR2KmsXViaje ?? []);
                    this.dataKmsVacios.set(response.data.iR3KmsVacios ?? []);
                    this.dataViajesMes.set(response.data.iR4ViajesCargadosMesDTOs ?? []);
                    this.dataDisponibilidad.set(response.data.iR5DisponiblidadMesDTO ?? []);
                    this.dataIR6.set(response.data.iR6ViajesKilometrosDTOs ?? []);
                    this.dataIR7.set(response.data.iR7ViajesKilometrosDTOs ?? []);
                    this.dataIR8.set(response.data.iR8IngrViajeCargadoDTO ?? []);
                    this.dataIR9.set(response.data.iR9IngrXUnidadDTO ?? []);
                    this.dataIR10.set(response.data.iR10IngrXKmDTO ?? []);
                } else {
                    console.warn('[Indicadores] responseCode inesperado:', response.responseCode, response.responseText);
                }
            },
            error: (error) => {
                console.error('[Indicadores] HTTP Error:', error.status, error.statusText);
                console.error('[Indicadores] Error body:', error.error);
            }
        });
    }

    async printPDF(): Promise<void> {
        try {
            const { jsPDF }             = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            /* ── helpers ─────────────────────────────────────── */
            const fmtVal = (value: any, format?: string): string => {
                if (value === null || value === undefined) return '';
                if (format === 'percent')       return (Number(value) * 100).toFixed(1) + '%';
                if (format === 'percent-int')   return Math.round(Number(value) * 100) + '%';
                if (format === 'decimal')       return typeof value === 'number' ? value.toFixed(2) : String(value);
                if (format === 'integer')       return typeof value === 'number' ? Math.floor(value).toLocaleString('es-MX') : String(value);
                if (format === 'currency')      return typeof value === 'number' ? value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
                if (format === 'currency-int')  return typeof value === 'number' ? '$' + Math.round(value).toLocaleString('es-MX') : String(value);
                if (format === 'currency-dec1') return typeof value === 'number' ? '$' + value.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : String(value);
                return String(value);
            };

            const colAlign = (col: ColumnDef): 'left' | 'center' | 'right' => {
                if (col.align) return col.align;
                const numFmts = ['currency', 'currency-int', 'currency-dec1', 'integer', 'decimal', 'percent', 'percent-int'];
                return numFmts.includes(col.format ?? '') ? 'right' : 'left';
            };

            /* ── layout ──────────────────────────────────────── */
            const pdf   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();   // 297
            const pageH = pdf.internal.pageSize.getHeight();  // 210
            const M     = 6;
            const GAP   = 4;
            const colW  = (pageW - M * 2 - GAP) / 2;         // ~140.5 mm

            /* ── colors ──────────────────────────────────────── */
            const BLUE:  [number,number,number] = [59,  130, 246];
            const WHITE: [number,number,number] = [255, 255, 255];
            const LGRAY: [number,number,number] = [248, 249, 250];
            const FOOT:  [number,number,number] = [226, 232, 240];
            const GREEN: [number,number,number] = [22,  163, 74 ];
            const RED:   [number,number,number] = [220, 38,  38 ];
            const DARK:  [number,number,number] = [30,  30,  30 ];
            const MGRAY: [number,number,number] = [100, 100, 100];

            /* ── card definitions ────────────────────────────── */
            const cards: any[] = [
                {
                    title: `Viajes Cargados del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: 'Viaje Promedio por Operador',
                    subtitle: this.subtitleOpActivos(),
                    trend: this.trendOpActivos(),
                    columns: this.colsOpActivos,
                    data: this.dataOpActivos(),
                    footer: this.footerOpActivos(),
                },
                {
                    title: `Kilómetros por Viaje Cargado del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: 'Kilómetros Cargados por Viaje',
                    subtitle: this.subtitleKmsXViaje(),
                    trend: this.trendKmsXViaje(),
                    columns: this.colsKmsXViaje,
                    data: this.dataKmsXViaje(),
                    footer: this.footerKmsXViaje(),
                },
                {
                    title: `Kilómetros Vacíos del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: '% de Kilómetros Vacíos',
                    subtitle: this.subtitleKmsVacios(),
                    trend: this.trendKmsVacios(),
                    columns: this.colsKmsVacios,
                    data: this.dataKmsVacios(),
                    footer: this.footerKmsVacios(),
                },
                {
                    title: `Viajes Cargados por Mes del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: 'Viaje por Día',
                    subtitle: this.subtitleViajesMes(),
                    trend: this.trendViajesMes(),
                    columns: this.colsViajesMes,
                    data: this.dataViajesMes(),
                    footer: this.footerViajesMes(),
                },
                {
                    title: `Disponibilidad por Mes del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: 'Disponibilidad Mensual',
                    subtitle: this.subtitleDisponibilidad(),
                    trend: this.trendDisponibilidad(),
                    columns: this.colsDisponibilidad,
                    data: this.dataDisponibilidad(),
                    footer: this.footerDisponibilidad(),
                },
                {
                    title: `Kilómetros del Mes del periodo ${this.selectedPeriodo}`,
                    kpis: this.kpisIR6(),
                    columns:  this.colsIR6,
                    data:     this.dataIR6(),
                    footer:   this.footerIR6(),
                    footerExtra: this.footerIR6Pct(),
                    columns2: this.colsIR7,
                    data2:    this.dataIR7(),
                    footer2:  this.footerIR7(),
                    footer2Extra: this.footerIR7Pct(),
                    footerOnly2: true,
                },
                {
                    title: `Ingreso por Viaje Cargado del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: 'Ingreso por Viaje Cargado',
                    subtitle: this.subtitleIR8(),
                    trend: this.trendIR8(),
                    columns: this.colsIR8,
                    data: this.dataIR8WithPct(),
                    footer: this.footerIR8(),
                },
                {
                    title: `Ingreso por Unidad del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: 'Ingreso por Unidad',
                    subtitle: this.subtitleIR9(),
                    trend: this.trendIR9(),
                    columns: this.colsIR9,
                    data: this.dataIR9(),
                    footer: this.footerIR9(),
                },
                {
                    title: `Ingreso por Km del periodo ${this.selectedPeriodo}`,
                    subtitleLabel: 'Ingreso por Kilómetro',
                    subtitle: this.subtitleIR10(),
                    trend: this.trendIR10(),
                    columns: this.colsIR10,
                    data: this.dataIR10(),
                    footer: this.footerIR10(),
                },
            ];

            /* ── render helpers ──────────────────────────────── */
            const drawTable = (
                cols: ColumnDef[], rows: any[],
                footer: any, footerExtra: any,
                x: number, startY: number
            ): number => {
                const rightMargin = pageW - (x + colW - 2);
                const colStyles: Record<number, any> = {};
                cols.forEach((c, i) => { colStyles[i] = { halign: colAlign(c) }; });

                const foot: string[][] = [];
                if (footer)      foot.push(cols.map(c => fmtVal(footer[c.field],      c.format)));
                if (footerExtra) foot.push(cols.map(c => fmtVal(footerExtra[c.field], c.format)));

                autoTable(pdf, {
                    head: [cols.map(c => c.header)],
                    body: rows.map(r => cols.map(c => fmtVal(r[c.field], c.format))),
                    foot,
                    startY,
                    margin: { left: x + 2, right: rightMargin, top: M, bottom: M },
                    styles:           { fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, overflow: 'linebreak' },
                    headStyles:       { fillColor: BLUE,  textColor: WHITE, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: LGRAY },
                    footStyles:       { fillColor: FOOT,  textColor: DARK,  fontStyle: 'bold' },
                    columnStyles: colStyles,
                    willDrawCell: (data: any) => {
                        if (data.section === 'foot') {
                            const col = cols[data.column.index];
                            if (col) data.cell.styles.halign = colAlign(col);
                            if (footerExtra && data.row.index === 1) {
                                data.cell.styles.textColor = GREEN;
                                data.cell.styles.fillColor = [240, 253, 244];
                            }
                        }
                    },
                });
                return (pdf as any).lastAutoTable?.finalY ?? startY;
            };

            const renderCard = (card: any, colIdx: 0 | 1) => {
                const x = M + colIdx * (colW + GAP);
                let y = M;

                // Card border
                pdf.setFillColor(...WHITE);
                pdf.setDrawColor(210, 214, 220);
                pdf.roundedRect(x, y, colW, pageH - M * 2, 2, 2, 'FD');
                y += 5;

                // Title
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                pdf.setTextColor(...DARK);
                const titleLines: string[] = pdf.splitTextToSize(card.title, colW - 6);
                pdf.text(titleLines, x + 3, y + 4);
                y += titleLines.length * 4.5 + 4;

                // Subtitle + trend
                if (card.subtitleLabel && card.subtitle) {
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(7);
                    pdf.setTextColor(...MGRAY);
                    pdf.text(card.subtitleLabel, x + colW / 2, y, { align: 'center' });
                    y += 5;

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(14);
                    pdf.setTextColor(...BLUE);
                    pdf.text(card.subtitle, x + colW / 2, y, { align: 'center' });
                    y += 7;

                    if (card.trend === 'up' || card.trend === 'down') {
                        const r = 3.5;
                        pdf.setFillColor(...(card.trend === 'up' ? GREEN : RED));
                        pdf.circle(x + colW / 2, y + r, r, 'F');
                        y += r * 2 + 4;
                    }
                    y += 2;
                }

                // KPI boxes (card 6)
                if (card.kpis?.length) {
                    const kpiW = (colW - 6) / card.kpis.length;
                    (card.kpis as KpiDef[]).forEach((kpi, ki) => {
                        const kx = x + 3 + ki * kpiW;
                        pdf.setFillColor(248, 248, 248);
                        pdf.setDrawColor(210, 214, 220);
                        pdf.roundedRect(kx, y, kpiW - 1, 15, 1, 1, 'FD');
                        pdf.setFont('helvetica', 'normal');
                        pdf.setFontSize(6);
                        pdf.setTextColor(...MGRAY);
                        pdf.text(kpi.label, kx + (kpiW - 1) / 2, y + 5, { align: 'center' });
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(10);
                        pdf.setTextColor(...BLUE);
                        pdf.text(kpi.value, kx + (kpiW - 1) / 2, y + 11, { align: 'center' });
                    });
                    y += 18;
                }

                // Main table
                y = drawTable(card.columns, card.data, card.footer, card.footerExtra, x, y) + 3;

                // Second table (card 6)
                if (card.columns2?.length) {
                    if (card.footerOnly2) {
                        drawTable(card.columns2, [], card.footer2, card.footer2Extra, x, y);
                    } else {
                        drawTable(card.columns2, card.data2 ?? [], card.footer2, card.footer2Extra, x, y);
                    }
                }
            };

            /* ── render all cards ────────────────────────────── */
            cards.forEach((card, i) => {
                if (i % 2 === 0 && i > 0) pdf.addPage();
                renderCard(card, (i % 2) as 0 | 1);
            });

            pdf.save(`Indicadores_${this.selectedPeriodo}.pdf`);
        } catch (err) {
            console.error('[PDF] Error:', err);
        }
    }
}
