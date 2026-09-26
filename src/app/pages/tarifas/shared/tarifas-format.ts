import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '@/app/types/tarifas';

/** Meses de inactividad que cubren las etiquetas de rutas inactivas ("jul–sep" con periodo septiembre). */
export const MESES_INACTIVIDAD = 3;

/** Mes (1–12) desde el que se cuentan las rutas nuevas ("RUTAS NUEVAS ABR-{MES}"). */
export const MES_INICIO_RUTAS_NUEVAS = 4;

export const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const LOCALE = 'es-MX';
const SIN_DATO = '—';

/** "$35,779,786" */
export function fmtMoneda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return SIN_DATO;
    const signo = valor < 0 ? '-' : '';
    return signo + '$' + Math.round(Math.abs(valor)).toLocaleString(LOCALE);
}

/** "$35.8M"; menor a $0.1M → "$0.05M"; 0 → "$0". */
export function fmtMillones(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return SIN_DATO;
    if (valor === 0) return '$0';
    const millones = Math.abs(valor) / 1_000_000;
    const decimales = millones < 0.1 ? 2 : 1;
    const signo = valor < 0 ? '-' : '';
    return signo + '$' + millones.toLocaleString(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + 'M';
}

/** Recibe fracción 0–1 → "18.5%". */
export function fmtPct(fraccion: number | null | undefined, decimales = 1): string {
    if (fraccion === null || fraccion === undefined) return SIN_DATO;
    return (fraccion * 100).toLocaleString(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + '%';
}

/** Recibe 0–100 → "4.0%". */
export function fmtPct100(valor: number | null | undefined, decimales = 1): string {
    if (valor === null || valor === undefined) return SIN_DATO;
    return valor.toLocaleString(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + '%';
}

/** "1,890" */
export function fmtEntero(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return SIN_DATO;
    return Math.round(valor).toLocaleString(LOCALE);
}

export function fmtDecimal(valor: number | null | undefined, decimales = 2): string {
    if (valor === null || valor === undefined) return SIN_DATO;
    return valor.toLocaleString(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/** 1 → "Ene" */
export function mesAbr(mes: number): string {
    return MESES_ABR[mes - 1] ?? '';
}

/** 1 → "enero" */
export function mesLargo(mes: number): string {
    return MESES_LARGO[mes - 1] ?? '';
}

/** (2026, 9) → "Septiembre 2026" */
export function nombrePeriodo(anio: number, mes: number): string {
    const nombre = mesLargo(mes);
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** Ventana de inactividad terminando en el mes del periodo: con septiembre y 3 meses → "jul–sep". */
export function etiquetaInactividad(mes: number, meses = MESES_INACTIVIDAD): string {
    const inicio = ((((mes - meses) % 12) + 12) % 12) + 1;
    return `${mesAbr(inicio).toLowerCase()}–${mesAbr(mes).toLowerCase()}`;
}

/** "2026-09-24T05:02:12" → "24/09/2026". Se lee el texto para no depender de la zona horaria. */
export function fmtFecha(iso: string | null | undefined): string {
    if (!iso) return SIN_DATO;
    const [anio, mes, dia] = iso.substring(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
}

/** "2026-09-24T05:02:12" → "24/09/2026 05:02". */
export function fmtFechaHora(iso: string | null | undefined): string {
    if (!iso) return SIN_DATO;
    const hora = iso.length >= 16 ? iso.substring(11, 16) : '';
    return `${fmtFecha(iso)} ${hora}`.trim();
}

/** 125 → "02:05" */
export function fmtDuracion(segundos: number | null | undefined): string {
    if (segundos === null || segundos === undefined) return SIN_DATO;
    const mm = Math.floor(segundos / 60);
    const ss = segundos % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function esProblemDetails(valor: unknown): valor is ProblemDetails {
    return typeof valor === 'object' && valor !== null && ('detail' in valor || 'title' in valor);
}

/** Mensaje para el usuario a partir de un error HTTP (usa ProblemDetails.detail cuando existe). */
export function mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
        if (esProblemDetails(error.error)) {
            return error.error.detail || error.error.title || `Error ${error.status}`;
        }
        if (error.status === 0) return 'No se pudo conectar con el servidor.';
        if (error.status === 401) return 'La sesión expiró. Vuelve a iniciar sesión.';
        if (error.status === 403) return 'No tienes permiso para consultar esta información.';
        return `Error ${error.status}: ${error.statusText}`;
    }
    return 'Ocurrió un error inesperado.';
}
