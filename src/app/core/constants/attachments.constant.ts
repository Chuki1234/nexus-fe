/**
 * Hạn mức và danh mục định dạng tệp đính kèm được phép trong NexusCord.
 * Đồng bộ tuyệt đối với cấu hình Backend NestJS và Supabase Storage.
 */
export const ATTACHMENT_LIMITS = {
  /** Dung lượng tối đa cho mỗi tệp: 10MB */
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  /** Số lượng tệp tối đa trong một tin nhắn: 5 tệp */
  MAX_FILES_PER_MESSAGE: 5,
  /** Tổng dung lượng tối đa cho tất cả tệp trong một tin nhắn: 30MB */
  MAX_TOTAL_SIZE_BYTES: 30 * 1024 * 1024,
  /**
   * Danh sách MIME types được phép chính xác (Canonical Whitelist).
   * Không sử dụng wildcard image/* để đảm bảo an toàn tuyệt đối.
   */
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/jfif',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/bmp',
    'image/avif',
    'audio/mpeg',
    'audio/mp3',
    'video/mp4',
    'video/x-m4v',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-matroska',
    'video/x-msvideo',
    'video/avi',
    'video/mpeg',
    'video/3gpp',
    'video/x-ms-wmv',
    'video/x-flv',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    'application/vnd.rar',
    'application/x-rar-compressed',
    'application/x-rar',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const,
};

export type AllowedAttachmentMimeType =
  (typeof ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES)[number];
