import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const feRoot = path.resolve(__dirname, '..');

const envLocalPath = path.join(feRoot, '.env.local');
const envTsPath = path.join(feRoot, 'src/environments/environment.ts');
const envLocalTsPath = path.join(feRoot, 'src/environments/environment.local.ts');

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

const envVars = parseDotEnv(envLocalPath);
const giphyKey = envVars.GIPHY_API_KEY || process.env.GIPHY_API_KEY || '';
const apiUrl = envVars.API_URL || process.env.API_URL || 'http://localhost:3000/api';
const apiBaseUrl = envVars.API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';
const supabaseUrl = envVars.SUPABASE_URL || process.env.SUPABASE_URL || 'https://ubdgjtjxcytwctsbtpjy.supabase.co';
const supabaseKey = envVars.SUPABASE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_HueUJF-kVoMvvjfAFup-Ng_AJUV3J7l';

const fileContent = `// Tự động tạo bởi scripts/generate-local-env.mjs từ .env.local (Không commit file này vào git)
export interface AppEnvironment {
  supabaseUrl: string;
  supabaseKey: string;
  apiUrl: string;
  apiBaseUrl: string;
  giphyApiKey: string;
}

export const environment: AppEnvironment = {
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  apiUrl: '${apiUrl}',
  apiBaseUrl: '${apiBaseUrl}',
  giphyApiKey: '${giphyKey}',
};
`;

fs.writeFileSync(envLocalTsPath, fileContent, 'utf8');
console.log('✔ Đã tạo thành công src/environments/environment.local.ts (untracked) từ .env.local / env vars.');
if (giphyKey) {
  console.log('✔ GIPHY_API_KEY đã được cấu hình cho môi trường local.');
} else {
  console.log('ℹ GIPHY_API_KEY đang để trống. Bạn có thể thêm GIPHY_API_KEY=... vào file nexus-fe/.env.local');
}
