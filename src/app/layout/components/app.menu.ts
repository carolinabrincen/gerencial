import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/services/auth.service';

@Component({
    selector: '[app-menu]',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu" #menuContainer>
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator">
                    @if (item.label) {
                        <span class="px-3 text-xs font-semibold uppercase tracking-wider text-surface-500">{{ item.label }}</span>
                    }
                </li>
            }
        }
    </ul> `
})
export class AppMenu implements OnInit {
    el = inject(ElementRef);
    private authService = inject(AuthService);

    @ViewChild('menuContainer') menuContainer!: ElementRef;
    model: any[] = [];

    ngOnInit() {
        const user = this.authService.getUser();
        this.model = [
            
            {
                label: 'Dashboards',
                icon: 'pi pi-home',
                path: '/dashboards',
                items: [
                    {
                        label: 'Analytics Dashboard',
                        icon: 'pi pi-fw pi-chart-pie',
                        routerLink: ['/dashboards/analytics']
                    },
                    {
                        label: 'Indicadores',
                        icon: 'pi pi-fw pi-chart-bar',
                        routerLink: ['/dashboards/indicadores']
                    },
                    {
                        label: 'Sales Dashboard',
                        icon: 'pi pi-fw pi-home',
                        routerLink: ['/dashboards/sales']
                    },
                    {
                        label: 'SaaS Dashboard',
                        icon: 'pi pi-fw pi-bolt',
                        routerLink: ['/dashboards/saas']
                    }
                ]
            }
        ];
    }
}
