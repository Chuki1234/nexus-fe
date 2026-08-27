/**
 * Đọc `message` trong thân lỗi của Nest. ValidationPipe trả về MẢNG chuỗi
 * ("property files should not exist", ...), còn các HttpException khác trả về
 * một chuỗi. Chỉ nhận chuỗi thì mọi lỗi 400 do validate đều bị bỏ qua, người
 * dùng nhận lại câu vô nghĩa "Http failure response for ...: 400 Bad Request".
 */
function readNestMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (Array.isArray(value)) {
    const parts = value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }
  return null;
}

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
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    if (typeof record['error'] === 'object' && record['error'] !== null) {
      const nested = record['error'] as Record<string, unknown>;
      const nestedMessage = readNestMessage(nested['message']);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
    // Thân lỗi là chuỗi thuần (express trả HTML/text khi lỗi xảy ra trước Nest).
    if (typeof record['error'] === 'string' && record['error'].trim()) {
      return record['error'];
    }
    const ownMessage = readNestMessage(record['message']);
    if (ownMessage) {
      return ownMessage;
    }
  }
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.message.includes('Timeout')) {
      return 'Quá thời gian tải lên tệp (timeout). Vui lòng thử lại.';
    }
    if (err.message.includes('Failed to fetch')) {
      return 'Mạng bị gián đoạn hoặc không thể kết nối máy chủ.';
    }
    return err.message;
  }
  return defaultMessage;
}
