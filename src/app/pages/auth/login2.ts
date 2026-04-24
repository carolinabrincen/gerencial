import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AppConfigurator } from '@/app/layout/components/app.configurator';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '@/app/services/auth.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-login-2',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, AppConfigurator, InputGroup, InputGroupAddon, HttpClientModule, ToastModule],
    providers: [MessageService],
    template: `<p-toast></p-toast>
        <div class="h-screen flex w-full bg-surface-50 dark:bg-surface-950">
            <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 items-center justify-center">
                <div class="w-11/12 sm:w-120">
                    <div class="flex flex-col">
                        <div style="height: 56px; width: 56px" class="bg-primary rounded-full flex items-center justify-center">
                            <i class="pi pi-sign-in text-surface-0 dark:text-surface-900 text-4xl!"></i>
                        </div>
                        <div class="mt-6">
                            <h1 class="m-0 text-primary font-semibold text-4xl">Bienvenido de nuevo!</h1>
                            <span class="block text-surface-700 dark:text-surface-100 mt-2">Portal GST Transportes - Ingrese sus datos</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 mt-12">
                        <p-input-group>
                            <p-inputgroup-addon>
                                <i class="pi pi-user"></i>
                            </p-inputgroup-addon>
                            <input pInputText type="text" [(ngModel)]="usuario" placeholder="Usuario" [disabled]="isLoading" />
                        </p-input-group>
                        <p-input-group>
                            <p-inputgroup-addon>
                                <i class="pi pi-key"></i>
                            </p-inputgroup-addon>
                            <input pInputText type="password" [(ngModel)]="password" placeholder="Password" [disabled]="isLoading" />
                        </p-input-group>
                        <div>
                            <button pButton pRipple (click)="onLogin()" [loading]="isLoading" [disabled]="isLoading" class="w-full" label="LOGIN"></button>
                        </div>
                        
                    </div>
                </div>
            </div>
            <div [style]="{ backgroundImage: 'url(/demo/images/pages/fondo.jpeg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
                
            </div>
        </div>
       `
})
export class Login2 {
    password: string = '';
    usuario: string = '';
    isLoading: boolean = false;

    constructor(private authService: AuthService, private messageService: MessageService, private router: Router) {}

    onLogin(): void {
        if (!this.usuario || !this.password) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validación',
                detail: 'Por favor, completa todos los campos'
            });
            return;
        }

        this.isLoading = true;

        this.authService.login({ usuario: this.usuario, password: this.password }).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: response.responseText || 'Inicio de sesión exitoso'
                });
                
                // Redirigir al dashboard después de 1.5 segundos
                setTimeout(() => {
                    this.router.navigate(['/dashboards']);
                }, 1500);
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Error de login:', error);
                const errorMessage = error.error?.responseText || error.message || 'Error al iniciar sesión. Verifica tu usuario y contraseña.';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: errorMessage
                });
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }
}
