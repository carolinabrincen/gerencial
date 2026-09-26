// Contratos de /api/tarifas, generados a partir de las respuestas reales de la API.
// Porcentajes: fracción 0–1 en todo el módulo, EXCEPTO RutaResumenDto.pctIncremento (0–100).

export type EstatusPeriodo = 'PRELIMINAR' | 'CERRADO';

export interface PeriodoEncabezadoDto {
    anio: number;
    mes: number;
    estatus: EstatusPeriodo;
    fechaDatosHasta: string;
}

export interface RespuestaPeriodoDto<T> {
    encabezado: PeriodoEncabezadoDto;
    datos: T[];
}

// ── Informe gerencial (acumulado / mensual) ──────────────────────────────────

// TOTAL_TOP20 y numClientes se consumen si la API los envía en el informe; si no, la vista
// toma TOTAL TOP 20 y el (n) de OTROS de top20Clientes (solo en el acumulado).
export type TipoFilaInforme = 'TOP20' | 'TOTAL_TOP20' | 'OTROS' | 'OUTLIERS' | 'TOTAL';

export interface InformeGerencialDto {
    anio: number;
    mesIni: number;
    mesFin: number;
    orden: number;
    tipoFila: TipoFilaInforme;
    /** Puede traer varios ids ("99, 191"). */
    idCliente: number | string | null;
    nombreCliente: string;
    tipoCobro: string | null;
    ventaTotal: number | null;
    numViajes: number | null;
    numRutas: number | null;
    pctVenta: number | null;
    numClientes?: number | null;
}

// ── Venta por categoría × tipo de cobro ──────────────────────────────────────

export type CategoriaVenta = 'INCREMENTO_TARIFA' | 'RUTAS_NUEVAS' | 'SIN_MODIFICACION' | 'FUERA_RANGO';

export interface VentaCategoriaDto {
    anio: number;
    orden: number;
    categoria: CategoriaVenta;
    tipoCobro: string;
    numRutas: number;
    venta: number;
    pctVenta: number;
    pctRutas: number;
    impactoMonto: number | null;
    pctImpacto: number | null;
    ventaTotalAnio: number;
    numRutasAnio: number;
}

// ── Cumplimiento de objetivo de ingreso por km ───────────────────────────────

export type CategoriaCumplimiento = 'INCREMENTO_TARIFA' | 'RUTAS_NUEVAS' | 'SIN_MODIFICACION';
export type EstadoCumplimiento = 'CUMPLE' | 'NO_CUMPLE';

export interface CumplimientoObjetivoDto {
    anio: number;
    ordenCategoria: number;
    categoria: CategoriaCumplimiento;
    ordenEstado: number;
    estado: EstadoCumplimiento;
    tipoOperacion: string;
    objetivoIngresoKm: number;
    numRutas: number;
    venta: number;
    rutasInactivas: number;
    numRutasEstado: number;
    ventaEstado: number;
    pctVentaEstado: number;
    pctRutasEstado: number;
    pctVentaEnCategoria: number;
    pctRutasEnCategoria: number;
    rutasInactivasEstado: number;
    pctInactivasEstado: number;
    numRutasCategoria: number;
    ventaCategoria: number;
    ventaTotalAnio: number;
    numRutasAnio: number;
}

// ── Top 20 clientes ──────────────────────────────────────────────────────────

export type TipoFilaTop20 = 'CLIENTE' | 'TOTAL_TOP20' | 'OTROS' | 'TOTAL';

export interface Top20ClienteDto {
    anio: number;
    orden: number;
    tipoFila: TipoFilaTop20;
    cliente: string;
    numClientes: number;
    venta: number;
    pctVenta: number;
    pctConIncremento: number;
    pctImpacto: number;
    pctSinIncremento: number;
    pctNuevas: number;
    pctCumple: number;
    pctNoCumple: number;
    pctSinObjetivo: number;
    rutasInactivasNoCumple: number;
    rutasNoCumple: number;
    rutasInactivasTexto: string;
    mesIncremento: string | null;
    ventaConIncremento: number;
    montoImpacto: number;
    ventaNuevas: number;
    ventaCumple: number;
    ventaNoCumple: number;
    ventaSinObjetivo: number;
    pctIncrementoCumple: number;
    pctIncrementoNoCumple: number;
    pctNuevasCumple: number;
    pctNuevasNoCumple: number;
}

// ── Paquete del comité ───────────────────────────────────────────────────────

export interface ComiteDto {
    encabezado: PeriodoEncabezadoDto;
    informeAcumulado: InformeGerencialDto[];
    informeMensual: InformeGerencialDto[];
    ventaCategorias: VentaCategoriaDto[];
    cumplimientoObjetivo: CumplimientoObjetivoDto[];
    top20Clientes: Top20ClienteDto[];
}

// ── Resumen por ruta ─────────────────────────────────────────────────────────

export interface EstadoJobDto {
    fechaUltimaEjecucion: string | null;
    estatusUltimaEjecucion: string | null;
    enProceso: boolean;
}

export interface RutaResumenDto {
    anio: number;
    idRuta: number;
    idClienteReclasificado: number;
    tipoCobro: string;
    kms: number;
    descRuta: string;
    nombreClienteReclasificado: string;
    categoria: string;
    tipoOperacion: string;
    numViajes: number;
    fleteTotal: number;
    tarifaInicial: number;
    tarifaFinal: number;
    /** 0–100 (p. ej. 4 = 4 %). */
    pctIncremento: number;
    montoIncremento: number;
    mesIncremento: string | null;
    ingresoPorKm: number;
    objetivoIngresoKm: number | null;
    cumpleObjetivo: boolean | null;
    inactiva: boolean | null;
}

export interface RutasTotalesDto {
    numRutas: number;
    fleteTotal: number;
    montoIncremento: number;
    ventasJulAgo: number;
}

export interface RutasPaginadasDto {
    encabezado: EstadoJobDto;
    totalRegistros: number;
    pagina: number;
    tamanoPagina: number;
    datos: RutaResumenDto[];
    totales: RutasTotalesDto;
}

export type RutasOrdenarPor =
    | 'venta'
    | 'montoIncremento'
    | 'pctIncremento'
    | 'cliente'
    | 'ruta'
    | 'kms'
    | 'numViajes'
    | 'ingresoPorKm'
    | 'tipoOperacion'
    | 'tipoCobro'
    | 'idRuta'
    | 'categoria'
    | 'mesIncremento'
    | 'objetivoIngresoKm'
    | 'cumpleObjetivo'
    | 'inactiva';

/** Columnas numéricas que se filtran por rango (parámetros {Campo}Min / {Campo}Max). */
export const RUTAS_RANGOS = ['kms', 'numViajes', 'venta', 'pctIncremento', 'montoIncremento', 'ingresoPorKm', 'objetivoIngresoKm'] as const;
export type RutasRango = (typeof RUTAS_RANGOS)[number];

export type RutasFiltroRangos = Partial<Record<`${RutasRango}Min` | `${RutasRango}Max`, number>>;

export interface RutasFiltro extends RutasFiltroRangos {
    idRuta?: number;
    mesIncremento?: string;
    cliente?: string;
    categoria?: 'incremento' | 'rutasNuevas' | 'sinModificacion';
    tipoOperacion?: string;
    tipoCobro?: string;
    cumpleObjetivo?: 'si' | 'no' | 'sinObjetivo';
    inactiva?: boolean;
    buscar?: string;
    anio?: number;
    ordenarPor?: RutasOrdenarPor;
    direccion?: 'asc' | 'desc';
    pagina?: number;
    tamanoPagina?: number;
}

// ── Errores ──────────────────────────────────────────────────────────────────

export interface ProblemDetails {
    type?: string | null;
    title?: string | null;
    status?: number | null;
    detail?: string | null;
    instance?: string | null;
}

export interface ValidationProblemDetails extends ProblemDetails {
    errors?: Record<string, string[]>;
}

// ── Detalle de ruta ──────────────────────────────────────────────────────────

export interface RutaLlave {
    anio: number;
    idRuta: number;
    idClienteReclasificado: number;
    tipoCobro: string;
    kms: number;
}

export interface RutaDetalleDto {
    idResumenRuta: number;
    idRuta: number;
    kms: number;
    descRuta: string;
    tipoOperacion: string;
    tipoCobro: string;
    idCliente: number;
    nombreCliente: string;
    idClienteReclasificado: number;
    nombreClienteReclasificado: string;
    categoria: string;
    fechaPrimera: string | null;
    fechaUltima: string | null;
    numViajes: number;
    fleteTotal: number;
    tarifaConvenioActual: number | null;
    ingresoPorKm: number | null;
    objetivoIngresoKm: number | null;
    cumpleObjetivo: boolean | null;
    tarifaEne: number | null;
    tarifaFeb: number | null;
    tarifaMar: number | null;
    tarifaAbr: number | null;
    tarifaMay: number | null;
    tarifaJun: number | null;
    tarifaJul: number | null;
    tarifaAgo: number | null;
    tarifaSep: number | null;
    tarifaOct: number | null;
    tarifaNov: number | null;
    tarifaDic: number | null;
    mesIncremento: string | null;
    tarifaInicial: number | null;
    tarifaFinal: number | null;
    diferenciaTarifa: number | null;
    /** 0–100. */
    pctIncremento: number | null;
    montoIncremento: number | null;
    tieneIncremento: boolean;
    kmsConIncremento: number | null;
    kmsSinIncremento: number | null;
    diferenciaIngresoKm: number | null;
    esRutaNueva: boolean;
    ventasJulAgo: number | null;
    rutasInactivasJulAgo: boolean | null;
    anio: number;
    fechaCalculo: string;
}

// ── Bitácora del job ─────────────────────────────────────────────────────────

export type EstatusEjecucion = 'EN_PROCESO' | 'OK' | 'ADVERTENCIA' | 'ERROR';

export interface EjecucionDto {
    idEjecucion: number;
    origen: string | null;
    fechaInicio: string;
    fechaFin: string | null;
    duracionSegundos: number | null;
    estatus: EstatusEjecucion;
    anioFoto: number | null;
    mesFoto: number | null;
    totalCategorias: number | null;
    totalInforme: number | null;
    mensaje: string | null;
}
