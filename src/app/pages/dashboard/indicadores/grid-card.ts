import { Component, Input, input, computed, output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import * as XLSX from 'xlsx';

export interface ColumnDef {
    field: string;
    header: string;
    format?: 'integer' | 'decimal' | 'percent' | 'percent-int' | 'currency' | 'currency-int' | 'currency-dec1';
    align?: 'left' | 'center' | 'right';
}

export interface KpiDef {
    label: string;
    value: string;
    trend: 'up' | 'down' | '';
}

@Component({
    selector: 'app-grid-card',
    standalone: true,
    imports: [CardModule, CommonModule, TableModule, ButtonModule],
    host: { '[class.compact-rows]': 'compactRows()' },
    styles: [
        `:host ::ng-deep .p-card .p-card-body { padding-left: 0; padding-right: 0; }`,
        `:host.compact-rows ::ng-deep .p-datatable-sm .p-datatable-thead > tr > th,
         :host.compact-rows ::ng-deep .p-datatable-sm .p-datatable-tbody > tr > td,
         :host.compact-rows ::ng-deep .p-datatable-sm .p-datatable-tfoot > tr > td
         { padding-top: calc(0.25rem - 1pt) !important; padding-bottom: calc(0.25rem - 1pt) !important; }`
    ],
    template: `
    <p-card styleClass="h-full">
        <ng-template #header>
            <div class="flex items-center justify-between px-4 pt-3 pb-0">
                <span class="font-semibold text-base">{{ title }}</span>
                <button pButton icon="pi pi-file-excel" size="small" severity="success" [text]="true" (click)="exportExcel()" title="Exportar Excel"></button>
            </div>
            @if (subtitle()) {
                <div class="text-center px-4 pt-2 pb-0">
                    @if (subtitleLabel()) {
                        <div class="text-sm text-surface-500 mb-1">{{ subtitleLabel() }}</div>
                    }
                    <div class="text-2xl font-bold text-primary">{{ subtitle() }}</div>
                    @if (trend() === 'up') {
                        <div class="inline-flex items-center justify-center mt-1 w-8 h-8 rounded-full bg-green-500 text-white"><i class="pi pi-arrow-up"></i></div>
                    } @else if (trend() === 'down') {
                        <div class="inline-flex items-center justify-center mt-1 w-8 h-8 rounded-full bg-red-500 text-white"><i class="pi pi-arrow-down"></i></div>
                    }
                </div>
            }
            @if (kpis().length) {
                <div class="grid gap-2 px-4 pt-2 pb-1" [style.grid-template-columns]="'repeat(' + kpis().length + ', 1fr)'">
                    @for (kpi of kpis(); track kpi.label) {
                        <div class="text-center border border-surface-200 rounded-lg py-2 px-1">
                            <div class="text-xs text-surface-500 mb-1">{{ kpi.label }}</div>
                            <div class="text-lg font-bold text-primary">{{ kpi.value }}</div>
                            @if (kpi.trend === 'up') {
                                <div class="inline-flex items-center justify-center mt-1 w-7 h-7 rounded-full bg-green-500 text-white"><i class="pi pi-arrow-up" style="font-size:0.75rem"></i></div>
                            } @else if (kpi.trend === 'down') {
                                <div class="inline-flex items-center justify-center mt-1 w-7 h-7 rounded-full bg-red-500 text-white"><i class="pi pi-arrow-down" style="font-size:0.75rem"></i></div>
                            }
                        </div>
                    }
                </div>
            }
        </ng-template>
        <div [class]="columns2.length ? (footerOnly2() ? 'flex flex-col gap-0 px-4 py-2' : 'flex flex-col gap-4 px-4 py-2') : 'overflow-auto px-4 py-2'">
            <div class="overflow-auto">
                @if (columns2.length && title1()) {
                    <div class="font-semibold text-sm mb-1 text-surface-600">{{ title1() }}</div>
                }
                <p-table
                    [value]="tableData()"
                    [tableStyle]="footerOnly2() ? { 'width': '100%', 'table-layout': 'fixed', 'font-size': '0.875rem' } : { 'min-width': '100%', 'font-size': '0.875rem' }"
                    [scrollable]="true"
                    scrollHeight="300px"
                    styleClass="p-datatable-sm"
                >
                    <ng-template #header>
                        <tr>
                            <th *ngFor="let col of columns" [pSortableColumn]="col.field" [style.text-align]="alignFor(col)" style="white-space:nowrap">
                                {{ col.header }}
                                <p-sortIcon [field]="col.field"></p-sortIcon>
                            </th>
                            @if (actionIcon) {
                                <th style="width:3.5rem"></th>
                            }
                        </tr>
                    </ng-template>
                    <ng-template #body let-row>
                        <tr>
                            <td *ngFor="let col of columns" [style.text-align]="alignFor(col)">{{ formatValue(row[col.field], col.format) }}</td>
                            @if (actionIcon) {
                                <td style="text-align:center; padding:0.25rem">
                                    <button pButton [icon]="actionIcon" size="small" [text]="true" severity="info" (click)="rowAction.emit(row)" [title]="actionLabel"></button>
                                </td>
                            }
                        </tr>
                    </ng-template>
                    <ng-template #footer>
                        <tr *ngIf="footerRow()" style="font-weight:600; background:var(--p-surface-100)">
                            <td *ngFor="let col of columns" [style.text-align]="alignFor(col)">{{ formatValue(footerRow()![col.field], col.format) }}</td>
                            @if (actionIcon) {
                                <td></td>
                            }
                        </tr>
                        <tr *ngIf="footerRowExtra()" style="background:var(--p-surface-50); font-weight:600; font-size:calc(0.8rem + 1pt)">
                            <td *ngFor="let col of columns" [style.text-align]="alignFor(col)" style="color:#16a34a">{{ formatValue(footerRowExtra()![col.field], col.format) }}</td>
                            @if (actionIcon) {
                                <td style="color:#16a34a"></td>
                            }
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td [attr.colspan]="columns.length + (actionIcon ? 1 : 0)" class="text-center text-surface-400 py-6">Sin datos</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            @if (columns2.length) {
                <div class="overflow-auto">
                    @if (!footerOnly2() && title2()) {
                        <div class="font-semibold text-sm mb-1 text-surface-600">{{ title2() }}</div>
                    }
                    <p-table
                        [value]="footerOnly2() ? [] : tableData2()"
                        [tableStyle]="footerOnly2() ? { 'width': '100%', 'table-layout': 'fixed', 'font-size': '0.875rem' } : { 'min-width': '100%', 'font-size': '0.875rem' }"
                        [scrollable]="!footerOnly2()"
                        [scrollHeight]="footerOnly2() ? '' : '300px'"
                        styleClass="p-datatable-sm"
                    >
                        <ng-template #header>
                            @if (!footerOnly2()) {
                                <tr>
                                    <th *ngFor="let col of columns2" [pSortableColumn]="col.field" [style.text-align]="alignFor(col)" style="white-space:nowrap">
                                        {{ col.header }}
                                        <p-sortIcon [field]="col.field"></p-sortIcon>
                                    </th>
                                </tr>
                            }
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td *ngFor="let col of columns2" [style.text-align]="alignFor(col)">{{ formatValue(row[col.field], col.format) }}</td>
                            </tr>
                        </ng-template>
                        <ng-template #footer>
                            <tr *ngIf="footerRow2()" style="font-weight:600; background:var(--p-surface-100)">
                                <td *ngFor="let col of columns2" [style.text-align]="alignFor(col)">{{ formatValue(footerRow2()![col.field], col.format) }}</td>
                            </tr>
                            <tr *ngIf="footerRow2Extra()" style="background:var(--p-surface-50); font-weight:600; font-size:calc(0.8rem + 1pt)">
                                <td *ngFor="let col of columns2" [style.text-align]="alignFor(col)" style="color:#16a34a">{{ formatValue(footerRow2Extra()![col.field], col.format) }}</td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            @if (!footerOnly2()) {
                                <tr>
                                    <td [attr.colspan]="columns2.length" class="text-center text-surface-400 py-6">Sin datos</td>
                                </tr>
                            }
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>
    </p-card>`
})
export class GridCard {
    @Input() title: string = 'Indicador';
    @Input() columns: ColumnDef[] = [];
    @Input() columns2: ColumnDef[] = [];
    @Input() actionIcon: string = '';
    @Input() actionLabel: string = '';
    rowAction = output<any>();

    tableDataInput  = input<any[]>([]);
    tableDataInput2 = input<any[]>([]);
    footerRow       = input<Record<string, any> | null>(null);
    footerRowExtra  = input<Record<string, any> | null>(null);
    footerRow2      = input<Record<string, any> | null>(null);
    footerRow2Extra = input<Record<string, any> | null>(null);
    subtitle      = input<string>('');
    subtitleLabel = input<string>('');
    trend         = input<'up' | 'down' | ''>('');
    kpis          = input<KpiDef[]>([]);
    title1       = input<string>('');
    title2       = input<string>('');
    footerOnly2  = input<boolean>(false);
    compactRows  = input<boolean>(false);
    tableData  = computed(() => this.tableDataInput()  ?? []);
    tableData2 = computed(() => this.tableDataInput2() ?? []);

    alignFor(col: ColumnDef): string {
        if (col.align) return col.align;
        return col.format === 'currency-int' ? 'right' : '';
    }

    formatValue(value: any, format?: string): string {
        if (value === null || value === undefined) return '';
        if (format === 'percent') return (Number(value) * 100).toFixed(1) + '%';
        if (format === 'percent-int') return Math.round(Number(value) * 100) + '%';
        if (format === 'decimal') return typeof value === 'number' ? value.toFixed(2) : String(value);
        if (format === 'integer')  return typeof value === 'number' ? Math.floor(value).toLocaleString('es-MX') : String(value);
        if (format === 'currency') return typeof value === 'number' ? value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
        if (format === 'currency-int') return typeof value === 'number' ? '$' + Math.round(value).toLocaleString('es-MX') : String(value);
        if (format === 'currency-dec1') return typeof value === 'number' ? '$' + value.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : String(value);
        return String(value);
    }

    exportExcel(): void {
        const toRows = (data: any[], cols: ColumnDef[]) => data.map((row: any) => {
            const mapped: Record<string, any> = {};
            cols.forEach(col => { mapped[col.header] = this.formatValue(row[col.field], col.format); });
            return mapped;
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(this.tableData(), this.columns)),
            (this.title1() || this.title).substring(0, 31));
        if (this.columns2.length) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(this.tableData2(), this.columns2)),
                (this.title2() || 'Tabla 2').substring(0, 31));
        }
        XLSX.writeFile(wb, `${this.title}.xlsx`);
    }
}
