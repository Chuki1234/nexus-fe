/**
 * Sao chép văn bản vào clipboard với cơ chế fallback tự động (dùng execCommand)
 * khi Clipboard API hiện đại bị chặn hoặc trong môi trường không an toàn.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Thử dùng navigator.clipboard
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback xuống execCommand
    }
  }

  // 2. Fallback dùng textarea ẩn
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);

      const selected =
        document.getSelection() && document.getSelection()!.rangeCount > 0
          ? document.getSelection()!.getRangeAt(0)
          : false;

      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (selected && document.getSelection()) {
        document.getSelection()!.removeAllRanges();
        document.getSelection()!.addRange(selected);
      }

      return successful;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Trích xuất nội dung sao chép từ bất kỳ loại tin nhắn nào (text, sticker, gif, file đính kèm, ảnh).
 */
export function extractMessageCopyableContent(msg: {
  content?: string | null;
  externalMedia?: { url?: string | null; embedUrl?: string | null; title?: string | null; mediaType?: string | null } | null;
  attachments?: Array<{ filename?: string | null; url?: string | null; signedUrl?: string | null }> | null;
  deletedAt?: string | null;
}): string {
  if (msg.deletedAt) {
    return '';
  }
  if (msg.content && msg.content.trim().length > 0) {
    return msg.content;
  }
  if (msg.externalMedia) {
    const url = msg.externalMedia.url || msg.externalMedia.embedUrl;
    if (url) return url;
    return msg.externalMedia.title || '';
  }
  if (msg.attachments && msg.attachments.length > 0) {
    const links = msg.attachments
      .map((a) => a.signedUrl || a.url || a.filename)
      .filter((s): s is string => Boolean(s && s.trim().length > 0));
    if (links.length > 0) {
      return links.join('\n');
    }
  }
  return '';
}
