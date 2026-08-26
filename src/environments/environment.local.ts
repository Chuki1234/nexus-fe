// Tự động tạo bởi scripts/generate-local-env.mjs từ .env.local (Không commit file này vào git)
export interface AppEnvironment {
  supabaseUrl: string;
  supabaseKey: string;
  apiUrl: string;
  apiBaseUrl: string;
  giphyApiKey: string;
}

export const environment: AppEnvironment = {
  supabaseUrl: 'https://ubdgjtjxcytwctsbtpjy.supabase.co',
  supabaseKey: 'sb_publishable_HueUJF-kVoMvvjfAFup-Ng_AJUV3J7l',
  apiUrl: 'http://localhost:3000/api',
  apiBaseUrl: 'http://localhost:3000',
  giphyApiKey: '',
};
