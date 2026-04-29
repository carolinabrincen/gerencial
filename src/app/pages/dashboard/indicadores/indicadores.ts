import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { GridCard, ColumnDef } from './grid-card';
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
import { dataUDN } from '@/app/types/data-udn';
import { dataOperaciones } from '@/app/types/data-operaciones';
import { dataPeriodos } from '@/app/types/data-periodos';

@Component({
    selector: 'app-dashboard-indicadores',
    standalone: true,
    imports: [GridCard, CommonModule, InputTextModule, IconFieldModule, InputIconModule, MultiSelectModule, FormsModule, ButtonModule, SelectModule, DialogModule, TableModule],
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
                    [columns]="colsDisponibilidad"
                    [tableDataInput]="dataDisponibilidad()"
                    [footerRow]="footerDisponibilidad()"
                    actionIcon="pi pi-list"
                    actionLabel="Ver detalle"
                    (rowAction)="openDetalle($event)"
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
                <div class="col-span-12">
                    <div class="font-semibold text-base mb-2">Detalle Mensual</div>
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
                            <tr *ngIf="(selectedDisponibilidadRow?.detalleMensual?.length ?? 0) > 0" style="font-weight:600; background:var(--p-surface-100)">
                                <td *ngFor="let col of colsDetalleMensual" [style.font-size]="isDayCol(col) ? '0.75rem' : null" style="text-align:center">{{ footerDetalleMensual[col.field] ?? '' }}</td>
                            </tr>
                            <tr *ngFor="let abRow of (selectedDisponibilidadRow?.altasBajas ?? [])">
                                <td *ngFor="let col of colsDetalleMensual" [style.font-size]="isDayCol(col) ? '0.75rem' : null" style="text-align:center">{{ abRow[col.field] ?? '' }}</td>
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
        const match = key.match(/^dia(\d+)$/i);
        return match ? match[1] : key;
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
        return Object.keys(data[0]).map(key => ({ field: key, header: this.toColHeader(key) }));
    }

    get colsAltasBajas(): ColumnDef[] {
        const data = this.selectedDisponibilidadRow?.altasBajas;
        if (!data?.length) return [];
        return Object.keys(data[0]).map(key => ({ field: key, header: this.toColHeader(key) }));
    }

    openDetalle(row: any): void {
        this.selectedDisponibilidadRow = row;
        this.dialogVisible = true;
    }

    dataOpActivos = signal<any[]>([]);
    dataKmsXViaje = signal<any[]>([]);
    dataKmsVacios = signal<any[]>([]);
    dataViajesMes = signal<any[]>([]);
    dataDisponibilidad = signal<any[]>([]);

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
        return footer.kmsVacios > footer.mesAnt ? 'up' : 'down';
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
        const kmsVacios         = totalKmsTotales > 0 ? (totalKmsTotales - totalKmsCargados) / totalKmsTotales : 0;
        const mesAntProm        = data.reduce((s: number, r: any) => s + (r.mesAnt ?? 0), 0) / data.length;
        return { udn: 'Total', kmsTotales: totalKmsTotales, kmsCargados: totalKmsCargados, kmsVacios, mesAnt: mesAntProm };
    });

    footerKmsXViaje = computed(() => {
        const data = this.dataKmsXViaje();
        if (!data.length) return null;
        const totalKmsCargados = data.reduce((s: number, r: any) => s + (r.kmsCargados    ?? 0), 0);
        const totalViajes      = data.reduce((s: number, r: any) => s + (r.viajesCargados ?? 0), 0);
        const kmsXViaje        = totalViajes > 0 ? totalKmsCargados / totalViajes : 0;
        const mesAntProm       = data.reduce((s: number, r: any) => s + (r.mesAnt ?? 0), 0) / data.length;
        return { udn: 'Total', kmsCargados: totalKmsCargados, viajesCargados: totalViajes, kmsXViaje, mesAnt: mesAntProm };
    });

    footerOpActivos = computed(() => {
        const data = this.dataOpActivos();
        if (!data.length) return null;
        const totalViajes = data.reduce((s: number, r: any) => s + (r.viajesCargados ?? 0), 0);
        const totalOperadores = data.reduce((s: number, r: any) => s + (r.operadores ?? 0), 0);
        const promXOp = totalOperadores > 0 ? totalViajes / totalOperadores : 0;
        const mesAntProm = data.reduce((s: number, r: any) => s + (r.mesAnt ?? 0), 0) / data.length;
        return { udn: 'Total', viajesCargados: totalViajes, operadores: totalOperadores, vjesPromOp: promXOp, mesAnt: mesAntProm };
    });

    colsOpActivos: ColumnDef[] = [
        { field: 'udn',            header: 'UDN' },
        { field: 'viajesCargados', header: 'Viajes Cargados', format: 'integer' },
        { field: 'operadores',     header: 'Operadores',      format: 'integer' },
        { field: 'vjesPromOp',     header: 'Prom. X Op.',     format: 'decimal' },
        { field: 'mesAnt',         header: 'Mes Ant.',        format: 'decimal' },
    ];

    colsKmsXViaje: ColumnDef[] = [
        { field: 'udn',            header: 'UDN' },
        { field: 'kmsCargados',    header: 'Kms Cargados',    format: 'integer' },
        { field: 'viajesCargados', header: 'Viajes Cargados', format: 'integer' },
        { field: 'kmsXViaje',      header: 'Kms X Viaje',     format: 'integer' },
        { field: 'mesAnt',         header: 'Mes Ant.',        format: 'integer' },
    ];

    colsKmsVacios: ColumnDef[] = [
        { field: 'udn',         header: 'UDN' },
        { field: 'kmsTotales',  header: 'Kms Totales',  format: 'integer' },
        { field: 'kmsCargados', header: 'Kms Cargados', format: 'integer' },
        { field: 'kmsVacios',   header: 'Kms Vacíos %', format: 'percent' },
        { field: 'mesAnt',      header: 'Mes Ant. %',   format: 'percent' },
    ];

    colsViajesMes: ColumnDef[] = [
        { field: 'mes',            header: 'Mes' },
        { field: 'viajesCargados', header: 'Viajes Cargados', format: 'integer' },
        { field: 'diasHabiles',    header: 'Días Hábiles',    format: 'integer' },
        { field: 'viajesXDia',     header: 'Viajes X Día',    format: 'decimal' },
    ];

    colsDisponibilidad: ColumnDef[] = [
        { field: 'mes',            header: 'Mes' },
        { field: 'operadores',     header: 'Operadores',       format: 'integer' },
        { field: 'disponibles',    header: 'Disponibles',      format: 'integer' },
        { field: 'disponibilidad', header: 'Disponibilidad %', format: 'percent' },
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
        console.log('[PDF] Iniciando...');
        const wrappers: HTMLElement[] = [];
        const saved: string[] = [];
        try {
            const { toJpeg } = await import('html-to-image');
            const { jsPDF } = await import('jspdf');
            console.log('[PDF] Librerías cargadas');

            const container = this.cardsContainer.nativeElement;
            const cardEls = Array.from(container.children) as HTMLElement[];
            console.log('[PDF] Cards encontradas:', cardEls.length);

            Array.from(document.querySelectorAll('.p-datatable-wrapper') as NodeListOf<HTMLElement>)
                .forEach(w => { wrappers.push(w); saved.push(w.style.cssText); w.style.maxHeight = 'none'; w.style.overflow = 'visible'; });
            console.log('[PDF] Wrappers expandidos:', wrappers.length);

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 5;
            const colW = (pageW - margin * 3) / 2;

            const captureOptions = {
                quality: 0.85,
                backgroundColor: '#ffffff',
                pixelRatio: 1.5,
                skipFonts: true,
                filter: (node: Element) => {
                    const tag = (node.tagName || '').toLowerCase();
                    return tag !== 'link' && tag !== 'script';
                }
            };

            for (let i = 0; i < cardEls.length; i++) {
                const col = i % 2;
                if (col === 0 && i > 0) pdf.addPage();

                console.log(`[PDF] Capturando card ${i + 1}/${cardEls.length}...`);
                const imgData = await toJpeg(cardEls[i], captureOptions);
                console.log(`[PDF] Card ${i + 1} capturada, bytes:`, imgData.length);

                const img = new Image();
                img.src = imgData;
                await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('img load failed')); });

                const imgH = Math.min((img.height / img.width) * colW, pageH - margin * 2);
                pdf.addImage(imgData, 'JPEG', margin + col * (colW + margin), margin, colW, imgH);
                console.log(`[PDF] Card ${i + 1} agregada al PDF.`);
            }

            pdf.save(`Indicadores_${this.selectedPeriodo}.pdf`);
            console.log('[PDF] PDF guardado.');
        } catch (err) {
            console.error('[PDF] Error:', err);
        } finally {
            wrappers.forEach((w, i) => { w.style.cssText = saved[i]; });
        }
    }
}
