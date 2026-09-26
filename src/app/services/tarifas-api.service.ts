import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import {
    ComiteDto,
    CumplimientoObjetivoDto,
    EjecucionDto,
    InformeGerencialDto,
    PeriodoEncabezadoDto,
    RespuestaPeriodoDto,
    RutaDetalleDto,
    RUTAS_RANGOS,
    RutaLlave,
    RutasFiltro,
    RutasPaginadasDto,
    Top20ClienteDto,
    VentaCategoriaDto
} from '@/app/types/tarifas';

@Injectable({
    providedIn: 'root'
})
export class TarifasApiService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);

    private get base(): string {
        return `${this.authService.apiUrl}/api/tarifas`;
    }

    getPeriodos(): Observable<PeriodoEncabezadoDto[]> {
        return this.http.get<PeriodoEncabezadoDto[]>(`${this.base}/periodos`);
    }

    getPeriodo(anio: number, mes: number): Observable<PeriodoEncabezadoDto> {
        return this.http.get<PeriodoEncabezadoDto>(this.urlPeriodo(anio, mes));
    }

    getInformeGerencial(anio: number, mes: number, tipo: 'acumulado' | 'mensual' = 'acumulado'): Observable<RespuestaPeriodoDto<InformeGerencialDto>> {
        const params = new HttpParams().set('tipo', tipo);
        return this.http.get<RespuestaPeriodoDto<InformeGerencialDto>>(`${this.urlPeriodo(anio, mes)}/informe-gerencial`, { params });
    }

    getVentaCategorias(anio: number, mes: number): Observable<RespuestaPeriodoDto<VentaCategoriaDto>> {
        return this.http.get<RespuestaPeriodoDto<VentaCategoriaDto>>(`${this.urlPeriodo(anio, mes)}/venta-categorias`);
    }

    getCumplimientoObjetivo(anio: number, mes: number): Observable<RespuestaPeriodoDto<CumplimientoObjetivoDto>> {
        return this.http.get<RespuestaPeriodoDto<CumplimientoObjetivoDto>>(`${this.urlPeriodo(anio, mes)}/cumplimiento-objetivo`);
    }

    getTop20Clientes(anio: number, mes: number): Observable<RespuestaPeriodoDto<Top20ClienteDto>> {
        return this.http.get<RespuestaPeriodoDto<Top20ClienteDto>>(`${this.urlPeriodo(anio, mes)}/top20-clientes`);
    }

    getComite(anio: number, mes: number): Observable<ComiteDto> {
        return this.http.get<ComiteDto>(`${this.urlPeriodo(anio, mes)}/comite`);
    }

    getRutas(filtro: RutasFiltro): Observable<RutasPaginadasDto> {
        let params = new HttpParams();
        const set = (nombre: string, valor: string | number | boolean | undefined) => {
            if (valor !== undefined && valor !== '') params = params.set(nombre, String(valor));
        };
        set('Cliente', filtro.cliente);
        set('Categoria', filtro.categoria);
        set('TipoOperacion', filtro.tipoOperacion);
        set('TipoCobro', filtro.tipoCobro);
        set('CumpleObjetivo', filtro.cumpleObjetivo);
        set('Inactiva', filtro.inactiva);
        set('Buscar', filtro.buscar);
        set('IdRuta', filtro.idRuta);
        set('MesIncremento', filtro.mesIncremento);
        for (const campo of RUTAS_RANGOS) {
            const nombre = campo.charAt(0).toUpperCase() + campo.slice(1);
            set(`${nombre}Min`, filtro[`${campo}Min`]);
            set(`${nombre}Max`, filtro[`${campo}Max`]);
        }
        set('Anio', filtro.anio);
        set('OrdenarPor', filtro.ordenarPor);
        set('Direccion', filtro.direccion);
        set('Pagina', filtro.pagina);
        set('TamanoPagina', filtro.tamanoPagina);
        return this.http.get<RutasPaginadasDto>(`${this.base}/rutas`, { params });
    }

    getRutaDetalle(llave: RutaLlave): Observable<RutaDetalleDto> {
        // String(number) es invariante: punto decimal y sin separador de miles.
        const segmentos = [llave.anio, llave.idRuta, llave.idClienteReclasificado, llave.tipoCobro, llave.kms].map((s) => encodeURIComponent(String(s)));
        return this.http.get<RutaDetalleDto>(`${this.base}/rutas/${segmentos.join('/')}`);
    }

    getEjecuciones(top = 30): Observable<EjecucionDto[]> {
        const params = new HttpParams().set('top', top);
        return this.http.get<EjecucionDto[]>(`${this.base}/ejecuciones`, { params });
    }

    private urlPeriodo(anio: number, mes: number): string {
        return `${this.base}/periodos/${encodeURIComponent(anio)}/${encodeURIComponent(mes)}`;
    }
}
