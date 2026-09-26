import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, catchError, firstValueFrom, forkJoin, map, of, switchMap, tap } from 'rxjs';
import * as XLSX from 'xlsx';
import { MessageService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { Popover, PopoverModule } from 'primeng/popover';
import { TarifasApiService } from '@/app/services/tarifas-api.service';
import { RUTAS_RANGOS, EstadoJobDto, RutaLlave, RutaResumenDto, RutasFiltro, RutasOrdenarPor, RutasPaginadasDto, RutasRango, RutasTotalesDto } from '@/app/types/tarifas';
import { MESES_ABR, fmtDecimal, fmtEntero, fmtFechaHora, fmtMoneda, fmtPct100, mensajeError } from '../shared/tarifas-format';
import { RutaDetalleDialog } from './ruta-detalle-dialog';

type Categoria = NonNullable<RutasFiltro['categoria']>;
type CumpleObjetivo = NonNullable<RutasFiltro['cumpleObjetivo']>;

interface Rango {
    min: number | null;
    max: number | null;
}

interface FiltrosForm {
    buscar: string;
    cliente: string;
    idRuta: number | null;
    categoria: Categoria | null;
    tipoOperacion: string | null;
    tipoCobro: string;
    mesIncremento: string;
    cumpleObjetivo: CumpleObjetivo | null;
    inactiva: 'true' | 'false' | null;
    rangos: Record<RutasRango, Rango>;
}

type ColumnaFiltro = 'idRuta' | 'ruta' | 'cliente' | 'categoria' | 'tipoOperacion' | 'tipoCobro' | 'mesIncremento' | 'cumpleObjetivo' | 'inactiva' | RutasRango;

interface Opcion<T> {
    label: string;
    value: T;
}

function filtrosVacios(): FiltrosForm {
    const rangos = Object.fromEntries(RUTAS_RANGOS.map((c) => [c, { min: null, max: null }])) as Record<RutasRango, Rango>;
    return { buscar: '', cliente: '', idRuta: null, categoria: null, tipoOperacion: null, tipoCobro: '', mesIncremento: '', cumpleObjetivo: null, inactiva: null, rangos };
}

const esRango = (col: ColumnaFiltro): col is RutasRango => (RUTAS_RANGOS as readonly string[]).includes(col);

const TITULOS: Record<ColumnaFiltro, string> = {
    idRuta: 'Id',
    ruta: 'Ruta',
    cliente: 'Cliente',
    kms: 'Kms',
    numViajes: 'Viajes',
    venta: 'Venta',
    categoria: 'Status',
    tipoOperacion: 'Operación',
    tipoCobro: 'Cobro',
    pctIncremento: '% Inc.',
    montoIncremento: 'Impacto',
    mesIncremento: 'Mes inc.',
    ingresoPorKm: 'Ingr/Km',
    objetivoIngresoKm: 'Objetivo',
    cumpleObjetivo: 'Cumple',
    inactiva: 'Inactiva'
};

const ORDENABLES: readonly RutasOrdenarPor[] = ['venta', 'montoIncremento', 'pctIncremento', 'cliente', 'ruta', 'kms', 'numViajes', 'ingresoPorKm', 'tipoOperacion', 'tipoCobro', 'idRuta', 'categoria', 'mesIncremento', 'objetivoIngresoKm', 'cumpleObjetivo', 'inactiva'];

const TAMANO_EXPORTACION = 2000;

type ValorOrden = string | number | null;

/** "Sep", "septiembre", "SEP-2026"… → 9; si no se reconoce el mes se ordena por el texto. */
function valorMes(mes: string | null): ValorOrden {
    if (!mes) return null;
    const texto = mes.trim().toLowerCase();
    const indice = MESES_ABR.findIndex((m) => texto.startsWith(m.toLowerCase()));
    return indice >= 0 ? indice + 1 : texto;
}

/** Texto corto por categoría (se compara sin acentos ni mayúsculas). */
const ETIQUETAS_CATEGORIA: Record<string, string> = {
    'SIN MODIFICACION': 'IGUAL',
    INCREMENTO: 'INCREMENTO',
    'RUTAS NUEVAS': 'NUEVA'
};

const aNumero = (v: boolean | null): number | null => (v === null ? null : Number(v));

/**
 * Columnas que la API no sabe ordenar: se piden todas las rutas del filtro y se ordenan y paginan aquí.
 * Cuando la API acepte alguna en OrdenarPor, basta con quitarla de este mapa.
 */
const ORDEN_LOCAL: Partial<Record<RutasOrdenarPor, (r: RutaResumenDto) => ValorOrden>> = {
    categoria: (r) => r.categoria,
    mesIncremento: (r) => valorMes(r.mesIncremento),
    objetivoIngresoKm: (r) => r.objetivoIngresoKm,
    cumpleObjetivo: (r) => aNumero(r.cumpleObjetivo),
    inactiva: (r) => aNumero(r.inactiva)
};

/** Orden estable; los vacíos siempre al final. */
function ordenarLocal(datos: RutaResumenDto[], valor: (r: RutaResumenDto) => ValorOrden, direccion: 1 | -1): RutaResumenDto[] {
    return [...datos].sort((a, b) => {
        const va = valor(a);
        const vb = valor(b);
        if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
        const comparacion = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
        return comparacion * direccion;
    });
}

const CATEGORIAS: Opcion<Categoria>[] = [
    { label: 'Incremento', value: 'incremento' },
    { label: 'Rutas nuevas', value: 'rutasNuevas' },
    { label: 'Sin modificación', value: 'sinModificacion' }
];

// Sin endpoint de catálogo: valores observados en los datos (la API compara por igualdad exacta).
const TIPOS_OPERACION: Opcion<string>[] = ['CAJA SECA', 'ENCORTINADO', 'GRADO ALIMENT', 'TOLVA GRANEL'].map((v) => ({ label: v, value: v }));

const CUMPLE: Opcion<CumpleObjetivo>[] = [
    { label: 'Cumple', value: 'si' },
    { label: 'No cumple', value: 'no' },
    { label: 'Sin objetivo', value: 'sinObjetivo' }
];

const INACTIVA: Opcion<'true' | 'false'>[] = [
    { label: 'Inactivas', value: 'true' },
    { label: 'Activas', value: 'false' }
];

@Component({
    selector: 'app-tarifas-rutas',
    standalone: true,
    imports: [FormsModule, NgTemplateOutlet, TableModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, TagModule, TooltipModule, PopoverModule, RutaDetalleDialog],
    template: `
        <div class="card -m-8!">
            <div class="flex flex-wrap items-center gap-2 mb-3">
                <div class="flex flex-wrap items-baseline gap-3 mr-auto">
                    <div class="font-semibold text-xl">Rutas</div>
                    @if (estadoJob(); as job) {
                        <span class="text-sm text-muted-color">Datos actualizados al {{ fechaHora(job.fechaUltimaEjecucion) }}</span>
                    }
                </div>
                <button pButton icon="pi pi-filter-slash" label="Limpiar filtros" severity="secondary" [outlined]="true" (click)="limpiar()"></button>
                <button pButton icon="pi pi-file-excel" label="Exportar a Excel" severity="success" [loading]="exportando()" [disabled]="total() === 0" (click)="exportar()"></button>
            </div>
            <p-table
                [value]="rutas()"
                [lazy]="true"
                [lazyLoadOnInit]="false"
                (onLazyLoad)="onLazyLoad($event)"
                [paginator]="true"
                [first]="first()"
                [rows]="rows()"
                [totalRecords]="total()"
                [rowsPerPageOptions]="[10, 20, 50, 100]"
                [loading]="cargando()"
                [sortField]="sortField()"
                [sortOrder]="sortOrder()"
                [scrollable]="true"
                size="small"
                [showCurrentPageReport]="true"
                currentPageReportTemplate="{first}–{last} de {totalRecords}"
            >
                <ng-template #header>
                    <tr>
                        <th pFrozenColumn pSortableColumn="idRuta" class="text-right!" style="min-width: 5.5rem">Id <p-sortIcon field="idRuta" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'idRuta' }" /></th>
                        <th pFrozenColumn pSortableColumn="ruta" style="min-width: 240px">Ruta <p-sortIcon field="ruta" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'ruta' }" /></th>
                        <th pSortableColumn="cliente" style="min-width: 200px">Cliente <p-sortIcon field="cliente" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'cliente' }" /></th>
                        <th pSortableColumn="kms" class="text-right!" style="min-width: 6rem">Kms <p-sortIcon field="kms" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'kms' }" /></th>
                        <th pSortableColumn="numViajes" class="text-right!" style="min-width: 7rem">Viajes <p-sortIcon field="numViajes" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'numViajes' }" /></th>
                        <th pSortableColumn="venta" class="text-right!">Venta <p-sortIcon field="venta" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'venta' }" /></th>
                        <th pSortableColumn="categoria">Status <p-sortIcon field="categoria" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'categoria' }" /></th>
                        <th pSortableColumn="tipoOperacion">Operación <p-sortIcon field="tipoOperacion" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'tipoOperacion' }" /></th>
                        <th pSortableColumn="tipoCobro" style="min-width: 7rem">Cobro <p-sortIcon field="tipoCobro" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'tipoCobro' }" /></th>
                        <th pSortableColumn="pctIncremento" class="text-right!" style="min-width: 7rem">% Inc. <p-sortIcon field="pctIncremento" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'pctIncremento' }" /></th>
                        <th pSortableColumn="montoIncremento" class="text-right!" style="min-width: 8rem">Impacto <p-sortIcon field="montoIncremento" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'montoIncremento' }" /></th>
                        <th pSortableColumn="mesIncremento" style="min-width: 8.2rem">Mes inc. <p-sortIcon field="mesIncremento" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'mesIncremento' }" /></th>
                        <th pSortableColumn="ingresoPorKm" class="text-right!" style="min-width: 7.5rem">Ingr/Km <p-sortIcon field="ingresoPorKm" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'ingresoPorKm' }" /></th>
                        <th pSortableColumn="objetivoIngresoKm" class="text-right!" style="min-width: 8.3rem">Objetivo <p-sortIcon field="objetivoIngresoKm" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'objetivoIngresoKm' }" /></th>
                        <th pFrozenColumn alignFrozen="right" pSortableColumn="cumpleObjetivo" style="min-width: 7.7rem">Cumple <p-sortIcon field="cumpleObjetivo" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'cumpleObjetivo' }" /></th>
                        <th pFrozenColumn alignFrozen="right" pSortableColumn="inactiva" style="min-width: 8rem">Inactiva <p-sortIcon field="inactiva" /><ng-container *ngTemplateOutlet="botonFiltro; context: { $implicit: 'inactiva' }" /></th>
                        <th pFrozenColumn alignFrozen="right"></th>
                    </tr>
                </ng-template>
                <ng-template #body let-r>
                    <tr>
                        <td pFrozenColumn class="text-right!">{{ r.idRuta }}</td>
                        <td pFrozenColumn>{{ r.descRuta }}</td>
                        <td>{{ r.nombreClienteReclasificado }}</td>
                        <td class="text-right!">{{ entero(r.kms) }}</td>
                        <td class="text-right!">{{ entero(r.numViajes) }}</td>
                        <td class="text-right!">{{ moneda(r.fleteTotal) }}</td>
                        <td class="text-center!">{{ etiquetaCategoria(r.categoria) }}</td>
                        <td>{{ r.tipoOperacion }}</td>
                        <td>{{ r.tipoCobro }}</td>
                        <td class="text-right!">{{ pct100(r.pctIncremento, 0) }}</td>
                        <td class="text-right!">{{ moneda(r.montoIncremento) }}</td>
                        <td class="text-center!">{{ r.mesIncremento ?? '-' }}</td>
                        <td class="text-right!">{{ moneda(r.ingresoPorKm) }}</td>
                        <td class="text-right!">{{ moneda(r.objetivoIngresoKm) }}</td>
                        <td pFrozenColumn alignFrozen="right" class="text-center!">
                            @if (r.cumpleObjetivo === true) {
                                <p-tag severity="success" value="Cumple" />
                            } @else if (r.cumpleObjetivo === false) {
                                <p-tag severity="danger" value="No cumple" />
                            } @else {
                                <p-tag severity="secondary" value="Sin objetivo" />
                            }
                        </td>
                        <td pFrozenColumn alignFrozen="right">{{ r.inactiva ? 'Sí' : 'No' }}</td>
                        <td pFrozenColumn alignFrozen="right">
                            <button pButton icon="pi pi-eye" [text]="true" [rounded]="true" pTooltip="Ver detalle" (click)="verDetalle(r)" aria-label="Ver detalle"></button>
                        </td>
                    </tr>
                </ng-template>
                <ng-template #footer>
                    @if (totales(); as t) {
                        <tr style="font-size: calc(1em + 1pt)">
                            <td pFrozenColumn></td>
                            <td pFrozenColumn class="font-bold!">Totales del filtro · {{ entero(t.numRutas) }} rutas</td>
                            <td colspan="3"></td>
                            <td class="text-right! font-bold!">{{ moneda(t.fleteTotal) }}</td>
                            <td colspan="4"></td>
                            <td class="text-right! font-bold!">{{ moneda(t.montoIncremento) }}</td>
                            <td colspan="3"></td>
                            <td pFrozenColumn alignFrozen="right"></td>
                            <td pFrozenColumn alignFrozen="right"></td>
                            <td pFrozenColumn alignFrozen="right"></td>
                        </tr>
                    }
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="17" class="text-center py-6">{{ error() ?? 'No hay rutas con los filtros seleccionados.' }}</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <ng-template #botonFiltro let-col>
            <button
                type="button"
                class="ml-1 p-0 border-0 bg-transparent cursor-pointer align-middle"
                [class.text-primary]="filtroAplicado(col)"
                [class.text-muted-color]="!filtroAplicado(col)"
                [attr.aria-label]="'Filtrar ' + titulo(col)"
                (click)="abrirFiltro($event, col)"
            >
                <i [class]="filtroAplicado(col) ? 'pi pi-filter-fill' : 'pi pi-filter'" style="font-size: 0.75rem"></i>
            </button>
        </ng-template>

        <p-popover #filtroPanel>
            @if (columnaFiltro(); as col) {
                <div class="flex flex-col gap-3 w-64" (keydown.enter)="aplicarFiltro()">
                    <div class="font-semibold">{{ titulo(col) }}</div>
                    @if (rangoActual(); as rango) {
                        <p-inputnumber [(ngModel)]="form.rangos[rango].min" placeholder="Mínimo" [maxFractionDigits]="2" styleClass="w-full" inputStyleClass="w-full" />
                        <p-inputnumber [(ngModel)]="form.rangos[rango].max" placeholder="Máximo" [maxFractionDigits]="2" styleClass="w-full" inputStyleClass="w-full" />
                    } @else {
                        @switch (col) {
                            @case ('idRuta') {
                                <p-inputnumber [(ngModel)]="form.idRuta" [useGrouping]="false" placeholder="Id de ruta" styleClass="w-full" inputStyleClass="w-full" />
                            }
                            @case ('ruta') {
                                <input pInputText class="w-full" placeholder="Ruta o id" [(ngModel)]="form.buscar" />
                            }
                            @case ('cliente') {
                                <input pInputText class="w-full" placeholder="Cliente" [(ngModel)]="form.cliente" />
                            }
                            @case ('tipoCobro') {
                                <input pInputText class="w-full" placeholder="Tipo de cobro" [(ngModel)]="form.tipoCobro" />
                            }
                            @case ('mesIncremento') {
                                <input pInputText class="w-full" placeholder="Mes de incremento" [(ngModel)]="form.mesIncremento" />
                            }
                            @case ('categoria') {
                                <p-select [options]="categorias" [(ngModel)]="form.categoria" optionLabel="label" optionValue="value" placeholder="Status" appendTo="self" styleClass="w-full" />
                            }
                            @case ('tipoOperacion') {
                                <p-select [options]="tiposOperacion" [(ngModel)]="form.tipoOperacion" optionLabel="label" optionValue="value" placeholder="Operación" appendTo="self" styleClass="w-full" />
                            }
                            @case ('cumpleObjetivo') {
                                <p-select [options]="cumple" [(ngModel)]="form.cumpleObjetivo" optionLabel="label" optionValue="value" placeholder="Objetivo" appendTo="self" styleClass="w-full" />
                            }
                            @case ('inactiva') {
                                <p-select [options]="inactiva" [(ngModel)]="form.inactiva" optionLabel="label" optionValue="value" placeholder="Actividad" appendTo="self" styleClass="w-full" />
                            }
                        }
                    }
                    <div class="flex justify-end gap-2">
                        <button pButton type="button" label="Limpiar" severity="secondary" [outlined]="true" size="small" (click)="limpiarColumna(col)"></button>
                        <button pButton type="button" label="Aplicar" size="small" (click)="aplicarFiltro()"></button>
                    </div>
                </div>
            }
        </p-popover>

        <app-ruta-detalle-dialog [llave]="llaveDetalle()" (cerrar)="llaveDetalle.set(null)" />
    `
})
export class TarifasRutas {
    private api = inject(TarifasApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly categorias = CATEGORIAS;
    readonly tiposOperacion = TIPOS_OPERACION;
    readonly cumple = CUMPLE;
    readonly inactiva = INACTIVA;
    etiquetaCategoria(categoria: string | null): string {
        if (!categoria) return '';
        const clave = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
        return ETIQUETAS_CATEGORIA[clave] ?? categoria;
    }

    titulo(col: ColumnaFiltro): string {
        return TITULOS[col];
    }

    readonly moneda = fmtMoneda;
    readonly entero = fmtEntero;
    readonly decimal = fmtDecimal;
    readonly pct100 = fmtPct100;
    readonly fechaHora = fmtFechaHora;

    form: FiltrosForm = filtrosVacios();

    private filtroPanel = viewChild.required<Popover>('filtroPanel');
    columnaFiltro = signal<ColumnaFiltro | null>(null);
    rangoActual = computed(() => {
        const col = this.columnaFiltro();
        return col && esRango(col) ? col : null;
    });

    rutas = signal<RutaResumenDto[]>([]);
    total = signal(0);
    totales = signal<RutasTotalesDto | null>(null);
    estadoJob = signal<EstadoJobDto | null>(null);
    cargando = signal(false);
    exportando = signal(false);
    error = signal<string | null>(null);

    first = signal(0);
    rows = signal(10);
    sortField = signal<RutasOrdenarPor>('venta');
    sortOrder = signal<1 | -1>(-1);

    llaveDetalle = signal<RutaLlave | null>(null);

    /** Filtros aplicados (los de la URL). */
    private filtros: RutasFiltro = {};
    private carga$ = new Subject<void>();
    /** Todas las rutas del filtro actual, para el orden local; se descarta al cambiar filtros. */
    private todas: RutasPaginadasDto | null = null;

    constructor() {
        this.carga$
            .pipe(
                tap(() => {
                    this.cargando.set(true);
                    this.error.set(null);
                }),
                switchMap(() =>
                    this.pedirPagina().pipe(
                        catchError((err: unknown) => {
                            const mensaje = mensajeError(err);
                            this.error.set(mensaje);
                            this.messageService.add({ severity: 'error', summary: 'Rutas', detail: mensaje });
                            return of(null);
                        })
                    )
                ),
                takeUntilDestroyed()
            )
            .subscribe((respuesta) => {
                this.cargando.set(false);
                // Nunca más renglones que el tamaño de página, aunque la respuesta traiga de más
                this.rutas.set((respuesta?.datos ?? []).slice(0, this.rows()));
                this.total.set(respuesta?.totalRegistros ?? 0);
                this.totales.set(respuesta?.totales ?? null);
                if (respuesta) this.estadoJob.set(respuesta.encabezado);
            });

        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
            this.form = this.leerFiltros(q);
            this.filtros = this.aFiltro(this.form);
            this.todas = null;
            this.first.set(0);
            this.carga$.next();
        });
    }

    buscar(): void {
        this.router.navigate([], { relativeTo: this.route, queryParams: this.aQueryParams(this.form) });
    }

    limpiar(): void {
        this.form = filtrosVacios();
        this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }

    abrirFiltro(event: MouseEvent, col: ColumnaFiltro): void {
        // Sin esto el clic también ordena la columna
        event.stopPropagation();
        const panel = this.filtroPanel();
        const target = event.currentTarget;
        if (panel.overlayVisible) {
            const mismaColumna = this.columnaFiltro() === col;
            panel.hide();
            if (mismaColumna) return;
            // Espera a que termine de cerrarse antes de abrirlo en la otra columna
            setTimeout(() => {
                this.columnaFiltro.set(col);
                panel.show(event, target);
            }, 150);
            return;
        }
        this.columnaFiltro.set(col);
        panel.show(event, target);
    }

    aplicarFiltro(): void {
        this.filtroPanel().hide();
        this.buscar();
    }

    limpiarColumna(col: ColumnaFiltro): void {
        if (esRango(col)) {
            this.form.rangos[col] = { min: null, max: null };
        } else if (col === 'ruta') {
            this.form.buscar = '';
        } else if (col === 'cliente' || col === 'tipoCobro' || col === 'mesIncremento') {
            this.form[col] = '';
        } else {
            this.form[col] = null;
        }
        this.aplicarFiltro();
    }

    /** Si la columna tiene un filtro aplicado (el de la URL, no el que se está editando). */
    filtroAplicado(col: ColumnaFiltro): boolean {
        if (esRango(col)) return this.filtros[`${col}Min`] !== undefined || this.filtros[`${col}Max`] !== undefined;
        return this.filtros[col === 'ruta' ? 'buscar' : col] !== undefined;
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? this.rows());
        const campo = typeof event.sortField === 'string' ? event.sortField : null;
        if (campo && (ORDENABLES as readonly string[]).includes(campo)) {
            this.sortField.set(campo as RutasOrdenarPor);
            this.sortOrder.set(event.sortOrder === 1 ? 1 : -1);
        }
        this.carga$.next();
    }

    verDetalle(r: RutaResumenDto): void {
        this.llaveDetalle.set({ anio: r.anio, idRuta: r.idRuta, idClienteReclasificado: r.idClienteReclasificado, tipoCobro: r.tipoCobro, kms: r.kms });
    }

    /** Pide todo el resultado filtrado y lo exporta en el orden de la tabla. */
    async exportar(): Promise<void> {
        this.exportando.set(true);
        try {
            const todas = await firstValueFrom(this.pedirTodas());
            const valor = ORDEN_LOCAL[this.sortField()];
            this.escribirExcel(valor ? ordenarLocal(todas.datos, valor, this.sortOrder()) : todas.datos);
        } catch (err: unknown) {
            this.messageService.add({ severity: 'error', summary: 'Exportar', detail: mensajeError(err) });
        } finally {
            this.exportando.set(false);
        }
    }

    private escribirExcel(datos: RutaResumenDto[]): void {
        const filas = datos.map((r) => ({
            Año: r.anio,
            'Id ruta': r.idRuta,
            Ruta: r.descRuta,
            'Id cliente reclasificado': r.idClienteReclasificado,
            Cliente: r.nombreClienteReclasificado,
            Categoría: r.categoria,
            'Tipo de operación': r.tipoOperacion,
            'Tipo de cobro': r.tipoCobro,
            Kms: r.kms,
            Viajes: r.numViajes,
            Venta: r.fleteTotal,
            'Tarifa inicial': r.tarifaInicial,
            'Tarifa final': r.tarifaFinal,
            '% incremento': r.pctIncremento,
            'Monto incremento': r.montoIncremento,
            'Mes incremento': r.mesIncremento ?? '',
            'Ingreso por km': r.ingresoPorKm,
            'Objetivo por km': r.objetivoIngresoKm ?? '',
            'Cumple objetivo': r.cumpleObjetivo === null ? 'Sin objetivo' : r.cumpleObjetivo ? 'Sí' : 'No',
            Inactiva: r.inactiva ? 'Sí' : 'No'
        }));
        const ws = XLSX.utils.json_to_sheet(filas);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rutas');
        const hoy = new Date();
        const sello = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(wb, `Rutas_Tarifas_${sello}.xlsx`);
    }

    /** Página actual: de la API, o de todas las rutas ordenadas aquí si la API no soporta la columna. */
    private pedirPagina(): Observable<RutasPaginadasDto> {
        const valor = ORDEN_LOCAL[this.sortField()];
        if (!valor) return this.api.getRutas(this.consulta(Math.floor(this.first() / this.rows()) + 1, this.rows()));
        const todas$ = this.todas ? of(this.todas) : this.pedirTodas().pipe(tap((t) => (this.todas = t)));
        return todas$.pipe(
            map((t) => ({ ...t, datos: ordenarLocal(t.datos, valor, this.sortOrder()).slice(this.first(), this.first() + this.rows()) }))
        );
    }

    /** Todo el resultado filtrado, en páginas de 2000. */
    private pedirTodas(): Observable<RutasPaginadasDto> {
        return this.api.getRutas(this.consulta(1, TAMANO_EXPORTACION)).pipe(
            switchMap((primera) => {
                const paginas = Math.ceil(primera.totalRegistros / TAMANO_EXPORTACION);
                if (paginas <= 1) return of(primera);
                return forkJoin(Array.from({ length: paginas - 1 }, (_, i) => this.api.getRutas(this.consulta(i + 2, TAMANO_EXPORTACION)))).pipe(
                    map((resto) => ({ ...primera, datos: [primera, ...resto].flatMap((p) => p.datos) }))
                );
            })
        );
    }

    /** Si la columna se ordena aquí, a la API se le pide por venta (un orden que sí conoce). */
    private consulta(pagina: number, tamanoPagina: number): RutasFiltro {
        const local = ORDEN_LOCAL[this.sortField()] !== undefined;
        const ordenarPor: RutasOrdenarPor = local ? 'venta' : this.sortField();
        const direccion = local ? 'desc' : this.sortOrder() === 1 ? 'asc' : 'desc';
        return { ...this.filtros, ordenarPor, direccion, pagina, tamanoPagina };
    }

    private leerFiltros(q: ParamMap): FiltrosForm {
        const enLista = <T extends string>(valor: string | null, opciones: Opcion<T>[]): T | null => opciones.find((o) => o.value === valor)?.value ?? null;
        const numero = (clave: string): number | null => {
            const valor = q.get(clave);
            if (valor === null || valor.trim() === '') return null;
            const n = Number(valor);
            return Number.isFinite(n) ? n : null;
        };
        const rangos = Object.fromEntries(RUTAS_RANGOS.map((c) => [c, { min: numero(`${c}Min`), max: numero(`${c}Max`) }])) as Record<RutasRango, Rango>;
        return {
            buscar: q.get('buscar') ?? '',
            cliente: q.get('cliente') ?? '',
            idRuta: numero('idRuta'),
            categoria: enLista(q.get('categoria'), CATEGORIAS),
            tipoOperacion: q.get('tipoOperacion'),
            tipoCobro: q.get('tipoCobro') ?? '',
            mesIncremento: q.get('mesIncremento') ?? '',
            cumpleObjetivo: enLista(q.get('cumpleObjetivo'), CUMPLE),
            inactiva: enLista(q.get('inactiva'), INACTIVA),
            rangos
        };
    }

    private aFiltro(f: FiltrosForm): RutasFiltro {
        const filtro: RutasFiltro = {
            buscar: f.buscar.trim() || undefined,
            cliente: f.cliente.trim() || undefined,
            idRuta: f.idRuta ?? undefined,
            categoria: f.categoria ?? undefined,
            tipoOperacion: f.tipoOperacion ?? undefined,
            tipoCobro: f.tipoCobro.trim() || undefined,
            mesIncremento: f.mesIncremento.trim() || undefined,
            cumpleObjetivo: f.cumpleObjetivo ?? undefined,
            inactiva: f.inactiva === null ? undefined : f.inactiva === 'true'
        };
        for (const campo of RUTAS_RANGOS) {
            filtro[`${campo}Min`] = f.rangos[campo].min ?? undefined;
            filtro[`${campo}Max`] = f.rangos[campo].max ?? undefined;
        }
        return filtro;
    }

    private aQueryParams(f: FiltrosForm): Record<string, string | number> {
        const params: Record<string, string | number> = {};
        const filtro = this.aFiltro(f);
        for (const [clave, valor] of Object.entries(filtro)) {
            if (valor !== undefined) params[clave] = typeof valor === 'boolean' ? String(valor) : valor;
        }
        return params;
    }
}
