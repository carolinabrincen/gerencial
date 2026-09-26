import { Component, DestroyRef, ElementRef, ViewEncapsulation, afterNextRender, inject, input, signal, viewChild } from '@angular/core';

/** Tamaño de diseño del lienzo; se escala al ancho disponible. */
export const SLIDE_ANCHO = 1360;
export const SLIDE_ALTO = 765;

/**
 * Lienzo 16:9 con el encabezado de diapositiva del comité (título).
 * Los estilos son globales (prefijo gst-) para que las tablas de cada pestaña los compartan.
 */
@Component({
    selector: 'app-slide-shell',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    template: `
        <div class="gst-slide-frame" #frame>
            <div class="gst-slide-canvas" [style.transform]="'scale(' + escala() + ')'">
                <header class="gst-slide-header">
                    <h1 class="gst-slide-title" [class.una-linea]="unaLinea()" [style.font-size.px]="tamanoTitulo()">{{ titulo() }}</h1>
                </header>
                <div class="gst-slide-body">
                    <ng-content />
                </div>
                @if (pie()) {
                    <footer class="gst-slide-foot">{{ pie() }}</footer>
                }
            </div>
        </div>
    `,
    styles: `
        .gst-slide-frame {
            position: relative;
            width: 100%;
            max-width: 1360px;
            aspect-ratio: 16 / 9;
            margin: 0 auto;
            overflow: hidden;
            background: #ffffff;
            box-shadow: 0 2px 10px rgba(15, 31, 61, 0.12);
        }
        .gst-slide-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 1360px;
            height: 765px;
            transform-origin: 0 0;
            display: flex;
            flex-direction: column;
            padding: 22px 40px 14px;
            background: #ffffff;
            color: #1f2937;
            font-family: Arial, Helvetica, sans-serif;
        }
        .gst-slide-header {
            display: flex;
            align-items: flex-start;
        }
        .gst-slide-title {
            margin: 0;
            font-size: 28px;
            line-height: 1.2;
            font-weight: 700;
            color: #0f1f3d;
        }
        .gst-slide-title.una-linea {
            white-space: nowrap;
        }
        .gst-slide-body {
            flex: 1;
            min-height: 0;
            margin-top: 14px;
            display: flex;
            flex-direction: column;
        }
        .gst-slide-foot {
            margin-top: 6px;
            font-size: 11px;
            color: #6b7280;
        }

        /* Tablas de las diapositivas */
        .gst-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
            line-height: 1.25;
            font-variant-numeric: tabular-nums;
        }
        .gst-table th {
            color: #ffffff;
            font-weight: 700;
            padding: 5px 8px;
            text-align: center;
            vertical-align: middle;
            border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .gst-table td {
            padding: 3px 8px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: middle;
        }
        .gst-table .num {
            text-align: right;
            white-space: nowrap;
        }
        .gst-table .centro {
            text-align: center;
        }
        .gst-table tr.fila-total-top20 td {
            background: #c9daf8;
            font-weight: 700;
        }
        .gst-table tr.fila-otros td {
            background: #f2f2f2;
            font-weight: 700;
        }
        .gst-table tr.fila-outliers td {
            background: #f2f2f2;
            font-style: italic;
        }
        .gst-table tr.fila-total td {
            background: #14254f;
            color: #ffffff;
            font-weight: 700;
        }
    `
})
export class SlideShell {
    titulo = input.required<string>();
    pie = input<string>();
    tamanoTitulo = input(28);
    unaLinea = input(false);

    escala = signal(1);

    private frame = viewChild.required<ElementRef<HTMLElement>>('frame');

    constructor() {
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const el = this.frame().nativeElement;
            const observer = new ResizeObserver(() => this.escala.set(el.clientWidth / SLIDE_ANCHO));
            observer.observe(el);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }
}
