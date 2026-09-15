import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { SensorsStore } from './stores/sensors.store';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NgxGaugeModule } from 'ngx-gauge';
import { SupabaseToken } from '../supabase';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Node } from './node/node';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [Node, NgxGaugeModule, MatProgressSpinnerModule],
})
export class App implements OnInit, OnDestroy {
  private supabaseConfig = inject(SupabaseToken);
  private sensorsStore = inject(SensorsStore);

  private subscription: RealtimeChannel | undefined;
  readings = this.sensorsStore.readings;
  loading = this.sensorsStore.loading;

  ngOnInit(): void {
    this.subscription = this.supabaseConfig.supabase
      .channel('sensors')
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
