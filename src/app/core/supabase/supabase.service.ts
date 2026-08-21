import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Owns the single Supabase client for the whole app.
 *
 * The client is also constructed during SSR/prerender, where there is no
 * localStorage to persist a session into and no URL fragment to read tokens
 * from — so every browser-only auth behaviour is gated on the platform.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
    auth: {
      persistSession: this.isBrowser,
      autoRefreshToken: this.isBrowser,
      // Callback tự đổi OAuth code thành session. Tự động detect ở lúc khởi tạo
      // client có thể chặn hydration, khiến trang chỉ còn HTML loading render sẵn.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}
