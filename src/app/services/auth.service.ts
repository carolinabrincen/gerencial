import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface LoginRequest {
    usuario: string;
    password: string;
}

export interface LoginResponse {
    responseCode: number;
    responseText: string;
    data: {
        token: {
            tokenUsuario: string;
            expira: string;
        };
        data: {
            idUsuario: string;
            nombre: string;
            idGrupo: string | null;
            grupo: string;
            idUnidad: number;
            unidadNegocio: string;
            permisos: any[];
        };
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    //readonly apiUrl = 'http://10.9.0.234/PortalGST2';
    readonly apiUrl = 'https://localhost:44361';
    private endpoint = '/api/Login';
    private tokenKey = 'auth_token';
    private userKey = 'auth_user';
    private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());

    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    constructor(private http: HttpClient) {}

    /**
     * Realiza el login con usuario y contraseña
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        console.log('Enviando petición de login a:', `${this.apiUrl}${this.endpoint}`);
        console.log('Datos:', credentials);
        
        return this.http.post<LoginResponse>(
            `${this.apiUrl}${this.endpoint}`,
            credentials
        ).pipe(
            tap(response => {
                console.log('Respuesta de login:', response);
                
                // Guardar token y datos del usuario si viene en la respuesta
                if (response.data?.token?.tokenUsuario) {
                    this.setToken(response.data.token.tokenUsuario);
                    if (response.data.data) {
                        this.setUser(response.data.data);
                    }
                    this.isAuthenticatedSubject.next(true);
                }
            })
        );
    }

    /**
     * Guarda el token en localStorage
     */
    setToken(token: string): void {
        localStorage.setItem(this.tokenKey, token);
    }

    /**
     * Obtiene el token guardado
     */
    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Guarda los datos del usuario
     */
    setUser(user: any): void {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    /**
     * Obtiene los datos del usuario
     */
    getUser(): any {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    /**
     * Verifica si existe un token válido
     */
    private hasToken(): boolean {
        return !!localStorage.getItem(this.tokenKey);
    }

    /**
     * Cierra la sesión
     */
    logout(): void {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.isAuthenticatedSubject.next(false);
    }

    /**
     * Obtiene el header de autorización
     */
    getAuthHeader(): { Authorization: string } | null {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : null;
    }
}
