import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { distinctUntilChanged, map, of, switchMap, tap, catchError } from 'rxjs';
import { toPng } from 'html-to-image';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TarifasApiService } from '@/app/services/tarifas-api.service';
import { ComiteDto, PeriodoEncabezadoDto } from '@/app/types/tarifas';
import { fmtFecha, mensajeError, nombrePeriodo } from '../shared/tarifas-format';
import { SLIDE_ALTO, SLIDE_ANCHO } from './slides/slide-shell';
import { SlideTop20Acumulado } from './slides/slide-top20-acumulado';
import { SlideVentaAcumulada } from './slides/slide-venta-acumulada';
import { SlideTop20Detalle } from './slides/slide-top20-detalle';
import { SlideTop20Mes } from './slides/slide-top20-mes';

interface OpcionPeriodo {
    label: string;
    value: string;
}

type ResultadoComite = { comite: ComiteDto; error: null } | { comite: null; error: string };

const PESTANAS = [
    { valor: 1, label: 'Top 20 acumulado' },
    { valor: 2, label: 'Venta acumulada' },
    { valor: 3, label: 'Top 20 detalle (1 de 2)' },
    { valor: 4, label: 'Top 20 detalle (2 de 2)' },
    { valor: 5, label: 'Top 20 del mes' }
];

@Component({
    selector: 'app-tarifas-comite',
    standalone: true,
    imports: [FormsModule, SelectModule, TagModule, ButtonModule, TabsModule, ProgressSpinnerModule, MessageModule, SlideTop20Acumulado, SlideVentaAcumulada, SlideTop20Detalle, SlideTop20Mes],
    template: `
        <div class="card mb-4">
            <div class="flex flex-wrap items-center gap-3">
                <div class="font-semibold text-xl mr-auto">Comité de incremento de tarifas</div>
                <p-select
                    [options]="opcionesPeriodo()"
                    [ngModel]="periodoSeleccionado()"
                    (ngModelChange)="cambiarPeriodo($event)"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Periodo"
                    [loading]="cargandoPeriodos()"
                    styleClass="w-full sm:w-56"
                />
                @if (encabezado(); as e) {
                    @if (e.estatus === 'CERRADO') {
                        <p-tag severity="success" value="CERRADO" />
                    } @else {
                        <p-tag severity="warn" [value]="'PRELIMINAR · Datos al ' + fecha(e.fechaDatosHasta)" />
                    }
                }
                <button pButton icon="pi pi-image" label="Descargar diapositiva" [loading]="descargando()" [disabled]="!comite() || cargando()" (click)="descargar()" class="w-full sm:w-auto"></button>
            </div>
        </div>

        <div class="card">
            <p-tabs [value]="slide()" (valueChange)="cambiarSlide($event)" scrollable>
                <p-tablist>
                    @for (p of pestanas; track p.valor) {
                        <p-tab [value]="p.valor">{{ p.label }}</p-tab>
                    }
                </p-tablist>
            </p-tabs>

            <div class="relative mt-4" style="min-height: 240px" #slideHost>
                @if (error(); as mensaje) {
                    <p-message severity="error" [text]="mensaje" />
                } @else if (comite(); as c) {
                    @switch (slide()) {
                        @case (1) {
                            <app-slide-top20-acumulado [comite]="c" />
                        }
                        @case (2) {
                            <app-slide-venta-acumulada [comite]="c" />
                        }
                        @case (3) {
                            <app-slide-top20-detalle [comite]="c" [parte]="1" />
                        }
                        @case (4) {
                            <app-slide-top20-detalle [comite]="c" [parte]="2" />
                        }
                        @case (5) {
                            <app-slide-top20-mes [comite]="c" />
                        }
                    }
                }
                @if (cargando()) {
                    <div class="absolute inset-0 flex items-center justify-center bg-surface-0/70 dark:bg-surface-900/70 z-10">
                        <p-progress-spinner strokeWidth="4" [style]="{ width: '56px', height: '56px' }" />
                    </div>
                }
            </div>
        </div>
    `
})
export class TarifasComite {
    private api = inject(TarifasApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly pestanas = PESTANAS;
    readonly fecha = fmtFecha;

    private slideHost = viewChild.required<ElementRef<HTMLElement>>('slideHost');

    periodos = signal<PeriodoEncabezadoDto[]>([]);
    cargandoPeriodos = signal(true);
    comite = signal<ComiteDto | null>(null);
    cargando = signal(false);
    error = signal<string | null>(null);
    descargando = signal(false);

    private params = toSignal(
        this.route.paramMap.pipe(map((p) => ({ anio: Number(p.get('anio')), mes: Number(p.get('mes')) }))),
        { requireSync: true }
    );

    slide = toSignal(
        this.route.queryParamMap.pipe(
            map((q) => {
                const n = Number(q.get('slide'));
                return Number.isInteger(n) && n >= 1 && n <= PESTANAS.length ? n : 1;
            })
        ),
        { initialValue: 1 }
    );

    periodoSeleccionado = computed(() => {
        const { anio, mes } = this.params();
        return anio && mes ? `${anio}-${mes}` : null;
    });

    opcionesPeriodo = computed<OpcionPeriodo[]>(() => this.periodos().map((p) => ({ label: nombrePeriodo(p.anio, p.mes), value: `${p.anio}-${p.mes}` })));

    /** Encabezado del paquete cargado; mientras no hay, el del listado de periodos. */
    encabezado = computed<PeriodoEncabezadoDto | null>(() => {
        const cargado = this.comite()?.encabezado;
        if (cargado) return cargado;
        const { anio, mes } = this.params();
        return this.periodos().find((p) => p.anio === anio && p.mes === mes) ?? null;
    });

    constructor() {
        this.api
            .getPeriodos()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (periodos) => {
                    this.periodos.set(periodos);
                    this.cargandoPeriodos.set(false);
                    const { anio, mes } = this.params();
                    if ((!anio || !mes) && periodos.length > 0) {
                        this.irAPeriodo(periodos[0].anio, periodos[0].mes, true);
                    }
                },
                error: (err: unknown) => {
                    this.cargandoPeriodos.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Periodos', detail: mensajeError(err) });
                }
            });

        // Una sola llamada a /comite por periodo; switchMap cancela la anterior y takeUntilDestroyed al salir.
        this.route.paramMap
            .pipe(
                map((p) => ({ anio: Number(p.get('anio')), mes: Number(p.get('mes')) })),
                distinctUntilChanged((a, b) => a.anio === b.anio && a.mes === b.mes),
                tap(({ anio, mes }) => {
                    this.error.set(null);
                    this.cargando.set(!!anio && !!mes);
                }),
                switchMap(({ anio, mes }) => {
                    if (!anio && !mes) return of<ResultadoComite | null>(null);
                    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
                        return of<ResultadoComite>({ comite: null, error: 'El periodo de la dirección no es válido.' });
                    }
                    return this.api.getComite(anio, mes).pipe(
                        map((comite): ResultadoComite => ({ comite, error: null })),
                        catchError((err: unknown) => of<ResultadoComite>({ comite: null, error: this.mensajeComite(err, anio, mes) }))
                    );
                }),
                takeUntilDestroyed()
            )
            .subscribe((resultado) => {
                this.cargando.set(false);
                if (!resultado) return;
                this.comite.set(resultado.comite);
                this.error.set(resultado.error);
            });
    }

    cambiarPeriodo(valor: string | null): void {
        if (!valor) return;
        const [anio, mes] = valor.split('-').map(Number);
        this.irAPeriodo(anio, mes, false);
    }

    cambiarSlide(valor: string | number | undefined): void {
        const n = Number(valor);
        if (!Number.isInteger(n) || n === this.slide()) return;
        this.router.navigate([], { relativeTo: this.route, queryParams: { slide: n }, queryParamsHandling: 'merge', replaceUrl: true });
    }

    async descargar(): Promise<void> {
        const lienzo = this.slideHost().nativeElement.querySelector<HTMLElement>('.gst-slide-canvas');
        const c = this.comite();
        if (!lienzo || !c) return;
        this.descargando.set(true);
        try {
            const dataUrl = await toPng(lienzo, {
                width: SLIDE_ANCHO,
                height: SLIDE_ALTO,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                style: { transform: 'none' }
            });
            const enlace = document.createElement('a');
            enlace.href = dataUrl;
            enlace.download = `comite-tarifas-${c.encabezado.anio}-${String(c.encabezado.mes).padStart(2, '0')}-diapositiva-${this.slide()}.png`;
            enlace.click();
        } catch {
            this.messageService.add({ severity: 'error', summary: 'Descarga', detail: 'No se pudo generar la imagen de la diapositiva.' });
        } finally {
            this.descargando.set(false);
        }
    }

    private irAPeriodo(anio: number, mes: number, reemplazar: boolean): void {
        this.router.navigate(['/tarifas/comite', anio, mes], { queryParamsHandling: 'preserve', replaceUrl: reemplazar });
    }

    private mensajeComite(err: unknown, anio: number, mes: number): string {
        const detalle = mensajeError(err);
        if (err instanceof HttpErrorResponse && err.status === 404) {
            return `No hay información del comité para ${nombrePeriodo(anio, mes)}. ${detalle}`;
        }
        return detalle;
    }
}
