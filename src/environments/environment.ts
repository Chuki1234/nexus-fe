// ⚠️ KHÔNG COMMIT FILE NÀY khi còn trỏ vào project cá nhân.
// Bản trên GitHub phải là project chung của nhóm:
//   supabaseUrl: 'https://ubdgjtjxcytwctsbtpjy.supabase.co'
//   supabaseKey: 'sb_publishable_HueUJF-kVoMvvjfAFup-Ng_AJUV3J7l'
// Đang trỏ tạm vào project cá nhân cho khớp SUPABASE_URL trong nexus-be/.env —
// đăng nhập gọi thẳng Supabase, hai bên lệch project là token không hợp lệ.
// Trả lại bằng: git checkout -- src/environments/environment.ts
export const environment = {
  supabaseUrl: 'https://dmyzzvmlaaynhjmkoecb.supabase.co',
  supabaseKey: 'sb_publishable_ozAkMRqzKkAD4cr4dW8lYg_hsbKhRib',
  /** nexus-be. Đăng ký đi qua backend; đăng nhập vẫn gọi thẳng Supabase. */
  apiUrl: 'http://localhost:3000/api',
};
