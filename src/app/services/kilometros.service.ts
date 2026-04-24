import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface IndicadoresResumenRequest {
    periodo: number;
    udn: string[];
    operacion: string[];
}

export interface IndicadoresResumenResponse {
    responseCode: number;
    responseText: string;
    data: {
        iR1OpActivos: any[];
        iR2KmsXViaje: any[];
        iR3KmsVacios: any[];
        iR4ViajesCargadosMesDTOs: any[];
        iR5DisponiblidadMesDTO: any[];
        iR6ViajesKilometrosDTOs: any[];
        iR6ViajesKilometrosPorDTO: any[];
        iR7ViajesKilometrosDTOs: any[];
        iR7ViajesKilometrosPorDTO: any[];
        iR8IngrViajeCargadoDTO: any[];
        iR9IngrXUnidadDTO: any[];
        iR10IngrXKmDTO: any[];
    };
}

@Injectable({
    providedIn: 'root'
})
export class KilometrosService {
    constructor(private http: HttpClient, private authService: AuthService) {}

    getIndicadoresResumen(body: IndicadoresResumenRequest): Observable<IndicadoresResumenResponse> {
        return this.http.post<IndicadoresResumenResponse>(`${this.authService.apiUrl}/api/Kilometros/IndicadoresResumen`, body);
    }
}
