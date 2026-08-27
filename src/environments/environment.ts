export interface AppEnvironment {
  supabaseUrl: string;
  supabaseKey: string;
  apiUrl: string;
  apiBaseUrl: string;
}

export const environment: AppEnvironment = {
  supabaseUrl: 'https://ubdgjtjxcytwctsbtpjy.supabase.co',
  supabaseKey: 'sb_publishable_HueUJF-kVoMvvjfAFup-Ng_AJUV3J7l',
  /** nexus-be. Đăng ký đi qua backend; đăng nhập vẫn gọi thẳng Supabase. */
  apiUrl: 'http://localhost:3000/api',
  apiBaseUrl: 'http://localhost:3000',
};
