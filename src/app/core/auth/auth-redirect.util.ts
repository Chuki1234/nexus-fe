const RETURN_URL_STORAGE_KEY = 'nexus_return_url';

/**
 * Làm sạch returnUrl chỉ chấp nhận đường dẫn nội bộ an toàn (bắt đầu bằng '/').
 * Chặn open redirect:
 * - Chặn null / undefined / chuỗi rỗng
 * - Chặn protocol-relative URLs (bắt đầu bằng '//')
 * - Chặn absolute URLs (chứa '://')
 * - Chặn javascript:, data:, vbscript:
 */
export function sanitizeReturnUrl(url: string | null | undefined, defaultUrl: string = '/'): string {
  if (!url || typeof url !== 'string') {
    return defaultUrl;
  }

  const trimmed = url.trim();

  // Phải bắt đầu bằng '/', không được bắt đầu bằng '//', và không chứa scheme '://'
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('://') &&
    !trimmed.toLowerCase().startsWith('/\\')
  ) {
    return trimmed;
  }

  return defaultUrl;
}

/**
 * Lưu returnUrl đã được sanitize vào sessionStorage để bảo toàn xuyên qua OAuth redirects.
 */
export function saveReturnUrl(url: string | null | undefined): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  const sanitized = sanitizeReturnUrl(url, '/');
  try {
    window.sessionStorage.setItem(RETURN_URL_STORAGE_KEY, sanitized);
  } catch (err) {
    console.warn('Không thể lưu returnUrl vào sessionStorage:', err);
  }
}

/**
 * Lấy returnUrl từ sessionStorage (nếu có), sanitize lại và dọn dẹp storage.
 */
export function getAndClearReturnUrl(fallbackParam?: string | null, defaultUrl: string = '/'): string {
  if (fallbackParam) {
    const sanitizedParam = sanitizeReturnUrl(fallbackParam, defaultUrl);
    if (sanitizedParam !== defaultUrl) {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.removeItem(RETURN_URL_STORAGE_KEY);
        } catch {
          // Ignore storage clean error
        }
      }
      return sanitizedParam;
    }
  }

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return sanitizeReturnUrl(fallbackParam, defaultUrl);
  }

  try {
    const stored = window.sessionStorage.getItem(RETURN_URL_STORAGE_KEY);
    window.sessionStorage.removeItem(RETURN_URL_STORAGE_KEY);
    if (stored) {
      return sanitizeReturnUrl(stored, defaultUrl);
    }
  } catch (err) {
    console.warn('Lỗi đọc returnUrl từ sessionStorage:', err);
  }

  return sanitizeReturnUrl(fallbackParam, defaultUrl);
}
