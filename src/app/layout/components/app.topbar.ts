import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { MegaMenuItem } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AuthService } from '@/app/services/auth.service';
import { Ripple } from 'primeng/ripple';
import { InputText } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { MegaMenuModule } from 'primeng/megamenu';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadge } from 'primeng/overlaybadge';

@Component({
    selector: '[app-topbar]',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, FormsModule, Ripple, InputText, ButtonModule, MegaMenuModule, BadgeModule, OverlayBadge],
    template: `
        <div class="layout-topbar-start">
            <a class="layout-topbar-logo" routerLink="/">
                <svg width="280" height="32" viewBox="0 0 280 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="layout-topbar-logo-full">
    <!-- Icono Original (Mantenido) -->
 

    <!-- Nuevo Texto GST Transportes -->
    <text 
    x="50" 
    y="25" 
    font-family="'Montserrat', sans-serif" 
    font-size="22" 
    font-weight="700" 
    fill="var(--topbar-item-text-color)">
    GST Transportes
</text>
</svg>
                <svg width="41" height="32" viewBox="0 0 41 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="layout-topbar-logo-slim">
                    <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M40.7209 8.57017C40.6612 8.42729 40.5217 8.33484 40.367 8.33484H38.2593L39.407 6.95037C39.502 6.83653 39.5211 6.67837 39.4583 6.54466C39.3955 6.41095 39.2606 6.32537 39.112 6.32537H15.9826L9.42361 0.10518C9.29643 -0.0147766 9.10336 -0.0346421 8.95625 0.0585729L5.27643 2.36221L5.27336 2.36526L5.26953 2.36679L0.92315 5.21978C0.912424 5.22666 0.907061 5.23735 0.897101 5.24576C0.875649 5.26257 0.857261 5.28091 0.840406 5.30154C0.825083 5.31987 0.812825 5.33821 0.801332 5.35884C0.789074 5.381 0.780646 5.40316 0.772985 5.42684C0.765323 5.45129 0.760726 5.47574 0.757662 5.50172C0.756895 5.51471 0.75 5.5254 0.75 5.53916C0.75 5.55138 0.755363 5.56055 0.756895 5.57278C0.759194 5.59799 0.764557 5.62168 0.772218 5.64689C0.77988 5.6721 0.788308 5.69579 0.801332 5.71948C0.806695 5.72941 0.807461 5.74011 0.813591 5.75004C0.818954 5.75844 0.828914 5.7615 0.835043 5.76914C0.861858 5.80352 0.89327 5.83179 0.930046 5.85471C0.943836 5.86312 0.954563 5.87382 0.968353 5.88069C1.01892 5.90514 1.07408 5.92119 1.13384 5.92119H6.36743L7.54883 8.86052L7.55036 8.86281V8.8651L15.2364 27.2292L10.6993 31.3353C10.582 31.4415 10.5422 31.608 10.5997 31.7555C10.6564 31.903 10.7989 32 10.9567 32H17.4889C17.5395 32 17.5893 31.9893 17.636 31.9702C17.6827 31.9511 17.7249 31.9228 17.7601 31.8877L21.194 28.4502C21.1986 28.4555 21.2001 28.4624 21.2055 28.4678L24.457 31.8808C24.5298 31.958 24.6256 31.9794 24.7367 32C30.6399 31.9671 39.5962 31.9373 40.0176 31.9809C40.0574 31.9939 40.098 32 40.1386 32C40.2697 32 40.3976 31.9335 40.4689 31.8182C40.6903 31.459 40.6887 31.4552 29.3765 20.2603L40.6374 8.98888C40.7477 8.87733 40.7799 8.71305 40.7209 8.57017ZM38.2983 7.08867L37.2663 8.33484H18.1018L16.7879 7.08867H38.2983ZM9.11178 0.862361L16.9909 8.33484H8.16329L5.95447 2.83898L9.11178 0.862361ZM2.41178 5.15636L5.29864 3.2615L6.0602 5.15636H2.41178ZM21.7602 27.9406C21.7502 27.9299 21.7364 27.9253 21.7257 27.9169L24.4701 25.1701V30.7844L21.7602 27.9406ZM39.2545 31.213C37.808 31.1916 34.214 31.1825 25.2362 31.2321V24.6513C25.2362 24.581 25.2117 24.5183 25.1788 24.461L28.8364 20.7997C32.4434 24.3701 37.5498 29.4519 39.2545 31.213ZM17.6222 30.9425L8.47894 9.0989H37.3506C37.3782 9.10501 37.4058 9.11342 37.4334 9.11342C37.4556 9.11342 37.4763 9.10272 37.4985 9.0989H39.4445L17.6222 30.9425Z"
                        fill="var(--topbar-item-text-color)"
                    />
                </svg>
            </a>
            <a #menuButton class="layout-menu-button" (click)="onMenuButtonClick()">
                <i class="pi pi-chevron-right"></i>
            </a>

            <button class="app-config-button app-config-mobile-button" (click)="toggleConfigSidebar()">
                <i class="pi pi-cog"></i>
            </button>

            <a #mobileMenuButton class="layout-topbar-mobile-button" (click)="onTopbarMenuToggle()">
                <i class="pi pi-ellipsis-v"></i>
            </a>
        </div>

        <div class="layout-topbar-end">
            <div class="layout-topbar-actions-start">
                <p-megamenu [model]="model" styleClass="layout-megamenu" breakpoint="0px"></p-megamenu>
            </div>
            <div class="layout-topbar-actions-end">
                <ul class="layout-topbar-items">
                    
                    <li>
                        <a pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true" class="flex items-center gap-2">
                            <img src="demo/images/avatar/amyelsner.png" alt="avatar" class="w-8 h-8" />
                           
                        </a>
                        <div class="hidden">
                            <ul class="list-none p-0 m-0">
                                <li>
                                    <a class="cursor-pointer flex items-center hover:bg-emphasis duration-150 transition-all px-4 py-2" pRipple (click)="onLogout()">
                                        <i class="pi pi-power-off mr-2"></i>
                                        <span>Logout</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </li>
                    
                </ul>
            </div>
        </div>
    `,
    host: {
        class: 'layout-topbar'
    },
    styles: `
        :host ::ng-deep .p-overlaybadge .p-badge {
            outline-width: 0px;
        }
    `
})
export class AppTopbar {
    layoutService = inject(LayoutService);
    authService = inject(AuthService);
    router = inject(Router);

    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

    @ViewChild('menuButton') menuButton!: ElementRef<HTMLButtonElement>;

    @ViewChild('mobileMenuButton') mobileMenuButton!: ElementRef<HTMLButtonElement>;

    model: MegaMenuItem[] = [
        {
            label: 'DASHBOARDS',
            items: [
                [
                    {
                        label: 'DASHBOARDS',
                        items: [
                            { label: 'Analytics Dashboard', icon: 'pi pi-fw pi-chart-pie', routerLink: '/dashboards/analytics' },
                            { label: 'Indicadores',         icon: 'pi pi-fw pi-chart-bar', routerLink: '/dashboards/indicadores' },
                            { label: 'Sales Dashboard',     icon: 'pi pi-fw pi-home',      routerLink: '/dashboards/sales' },
                            { label: 'SaaS Dashboard',      icon: 'pi pi-fw pi-bolt',      routerLink: '/dashboards/saas' }
                        ]
                    }
                ]
            ]
        }
    ];

    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    onRightMenuButtonClick() {
        this.layoutService.openRightMenu();
    }

    toggleConfigSidebar() {
        if (this.layoutService.isSidebarActive()) {
            this.layoutService.layoutState.update((prev) => ({
                ...prev,
                overlayMenuActive: false,
                staticMenuMobileActive: false,
                menuHoverActive: false,
                configSidebarVisible: true
            }));
        } else {
            this.layoutService.toggleConfigSidebar();
        }
    }

    focusSearchInput() {
        setTimeout(() => {
            this.searchInput.nativeElement.focus();
        }, 150);
    }

    onTopbarMenuToggle() {
        this.layoutService.layoutState.update((val) => ({ ...val, topbarMenuActive: !val.topbarMenuActive }));
    }

    onLogout() {
        this.layoutService.layoutState.update((prev) => ({
            ...prev,
            topbarMenuActive: false
        }));
        this.authService.logout();
        this.router.navigate(['/auth/login2']);
    }
}
