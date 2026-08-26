/**
 * Bọc một Promise (hoặc thenable như `PostgrestBuilder` của supabase-js) với
 * thời hạn: hết hạn thì reject thay vì chờ vô thời hạn.
 *
 * `fetch` (nền tảng của supabase-js) không có timeout mặc định. Một kết nối bị
 * treo — mạng chập chờn, hoặc project Supabase free-tier đang "thức dậy" sau
 * thời gian tạm dừng — sẽ giữ Promise gốc pending vô thời hạn, kéo theo UI đứng
 * yên không giới hạn (route guard không bao giờ resolve, ví dụ).
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
