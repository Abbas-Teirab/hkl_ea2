import { InjectionToken, isDevMode } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabase: SupabaseClient;
}

export const SupabaseToken = new InjectionToken<SupabaseConfig>('Supabase SDK', {
  providedIn: 'root',
  factory() {
    const supabaseURL: string = 'http://localhost:8000';
    const supabaseKey: string =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODkzNjc3NjAsImV4cCI6MTk0NzA0Nzc2MH0.HC39l6omcv2FQfBEFPWTNLet2h8DdndSOJsnwUKaYmY';
    const supabase: SupabaseClient = createClient(supabaseURL, supabaseKey);
    return { supabase };
  },
});
