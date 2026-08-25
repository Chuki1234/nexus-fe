/**
 * Chuẩn hóa và trích xuất thông điệp lỗi an toàn từ kiểu unknown.
 * Tránh ép kiểu any khi bắt lỗi trong khối try/catch.
 */
export function extractErrorMessage(
  err: unknown,
  defaultMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
): string {
  if (!err) {
    return defaultMessage;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    if (typeof record['error'] === 'object' && record['error'] !== null) {
      const nested = record['error'] as Record<string, unknown>;
      if (typeof nested['message'] === 'string' && nested['message'].trim()) {
        return nested['message'];
      }
    }
    if (typeof record['message'] === 'string' && record['message'].trim()) {
      return record['message'];
    }
  }
  return defaultMessage;
}
