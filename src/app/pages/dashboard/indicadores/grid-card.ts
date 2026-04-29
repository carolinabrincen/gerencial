import { Component, Input, input, computed, output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import * as XLSX from 'xlsx';

export interface ColumnDef {
    field: string;
    header: string;
    format?: 'integer' | 'decimal' | 'percent';
}

@Component({
    selector: 'app-grid-card',
    standalone: true,
    imports: [CardModule, CommonModule, TableModule, ButtonModule],
    styles: [`:host ::ng-deep .p-card .p-card-body { padding-left: 0; padding-right: 0; }`],
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
        </ng-template>
        <div class="overflow-auto px-4 py-2">
            <p-table
                [value]="tableData()"
                [tableStyle]="{ 'min-width': '100%', 'font-size': '0.875rem' }"
                [scrollable]="true"
                scrollHeight="300px"
                styleClass="p-datatable-sm"
            >
                <ng-template #header>
                    <tr>
                        <th *ngFor="let col of columns" [pSortableColumn]="col.field" style="white-space:nowrap">
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
                        <td *ngFor="let col of columns">{{ formatValue(row[col.field], col.format) }}</td>
                        @if (actionIcon) {
                            <td style="text-align:center; padding:0.25rem">
                                <button pButton [icon]="actionIcon" size="small" [text]="true" severity="info" (click)="rowAction.emit(row)" [title]="actionLabel"></button>
                            </td>
                        }
                    </tr>
                </ng-template>
                <ng-template #footer>
                    <tr *ngIf="footerRow()" style="font-weight:600; background:var(--p-surface-100)">
                        <td *ngFor="let col of columns">{{ formatValue(footerRow()![col.field], col.format) }}</td>
                        @if (actionIcon) {
                            <td></td>
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
    </p-card>`
})
export class GridCard {
    @Input() title: string = 'Indicador';
    @Input() columns: ColumnDef[] = [];
    @Input() actionIcon: string = '';
    @Input() actionLabel: string = '';
    rowAction = output<any>();

    tableDataInput = input<any[]>([]);
    footerRow = input<Record<string, any> | null>(null);
    subtitle = input<string>('');
    subtitleLabel = input<string>('');
    trend = input<'up' | 'down' | ''>('');
    tableData = computed(() => this.tableDataInput() ?? []);

    formatValue(value: any, format?: string): string {
        if (value === null || value === undefined) return '';
        if (format === 'percent') return (Number(value) * 100).toFixed(1) + '%';
        if (format === 'decimal') return typeof value === 'number' ? value.toFixed(2) : String(value);
        if (format === 'integer') return typeof value === 'number' ? Math.round(value).toLocaleString('es-MX') : String(value);
        return String(value);
    }

    exportExcel(): void {
        const rows = this.tableData().map((row: any) => {
            const mapped: Record<string, any> = {};
            this.columns.forEach(col => {
                mapped[col.header] = this.formatValue(row[col.field], col.format);
            });
            return mapped;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, this.title.substring(0, 31));
        XLSX.writeFile(wb, `${this.title}.xlsx`);
    }
}
