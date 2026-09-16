import { Component, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseToken } from '../supabase';
import { SensorsStore } from './stores/sensors.store';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
  ],
})
export class App implements OnInit, OnDestroy {
  private supabaseConfig = inject(SupabaseToken);
  private sensorsStore = inject(SensorsStore);
  private subscription: RealtimeChannel | undefined;
  private readonly sensorsChannelName = `sensors-${Math.random().toString(36).slice(2)}`;

  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly isMobile = toSignal(
    this.breakpoints.observe('(max-width: 768px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly sidenavOpen = signal(false);

  constructor() {
    effect(() => {
      this.sidenavOpen.set(!this.isMobile());
    });
  }

  protected toggleSidenav() {
    this.sidenavOpen.update((v) => !v);
  }

  protected closeSidenavOnMobile() {
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }
  }
  ngOnInit(): void {
    this.subscription = this.supabaseConfig.supabase
      .channel(this.sensorsChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, (payload) => {
        this.sensorsStore.loadSensors();
      })
      .subscribe();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.supabaseConfig.supabase.removeChannel(this.subscription);
    }
  }
}
