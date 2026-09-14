import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SensorsStore } from './stores/sensors.store';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseApi } from '../supabase';
@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private sensorsStore = inject(SensorsStore);
  protected readonly title = signal('frontend');
  // private subscription: RealtimeChannel;

  ngOnInit(): void {
    // this.subscription = SupabaseApi.channel('table-db-changes')
    //   .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
    //     console.log('Change received!', payload);
    //   })
    //   .subscribe();
  }

  ngOnDestroy(): void {}
}
