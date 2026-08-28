import { environment } from '../../../environments/environment';

export interface ClipboardMessagePayload {
  text: string;
  files: File[];
  hasRichContent: boolean;
  failedResourceCount: number;
}

const MAX_CLIPBOARD_FILES = 5;
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_BATCH_BYTES = 30 * 1024 * 1024; // 30MB
const FETCH_RESOURCE_TIMEOUT_MS = 8000;

export const PORTABLE_FILE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'jfif',
  'png',
  'webp',
  'gif',
  'svg',
  'bmp',
  'avif',
  'mp3',
  'mp4',
  'm4v',
  'webm',
  'ogv',
  'mov',
  'qt',
  'mkv',
  'avi',
  'mpeg',
  'mpg',
  '3gp',
  'wmv',
  'flv',
  'pdf',
  'txt',
  'zip',
  '7z',
  'tar',
  'rar',
  'gz',
  'docx',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  '3gp': 'video/3gpp',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  pdf: 'application/pdf',
  txt: 'text/plain',
  zip: 'application/zip',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  rar: 'application/vnd.rar',
  gz: 'application/gzip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function fileKey(file: File): string {
  return `${file.name}|${file.type}|${file.size}|${file.lastModified}`;
}

function extensionForMime(mime: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
  };
  return extensions[mime] || 'bin';
}

function filenameFromImage(src: string, alt: string, mime: string, index: number): string {
  const cleanAlt = alt.trim().replace(/[\\/:*?"<>|]/g, '-');
  if (cleanAlt) {
    return cleanAlt.includes('.') ? cleanAlt : `${cleanAlt}.${extensionForMime(mime)}`;
  }

  try {
    const baseUrl = globalThis.location?.href || 'http://localhost/';
    const pathname = new URL(src, baseUrl).pathname;
    const candidate = decodeURIComponent(pathname.split('/').pop() || '');
    if (candidate && candidate.includes('.')) return candidate;
  } catch {
    // data URL hoặc URL không hợp lệ
  }

  return `clipboard-image-${Date.now()}-${index + 1}.${extensionForMime(mime)}`;
}

function cleanFilename(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

function extensionFromFilename(value: string): string {
  const cleanValue = value.split(/[?#]/, 1)[0];
  return cleanValue.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() || '';
}

function filenameForLink(link: HTMLAnchorElement): string | null {
  const explicit = link.getAttribute('download') || link.getAttribute('data-filename') || '';
  const label = link.textContent || '';
  const href = link.href || link.getAttribute('href') || '';
  const pathCandidate = (() => {
    try {
      return decodeURIComponent(
        new URL(href, globalThis.location?.href || 'http://localhost/').pathname,
      )
        .split('/')
        .pop();
    } catch {
      return '';
    }
  })();
  const candidates = [explicit, label.trim(), pathCandidate || ''];
  const matched = candidates.find((candidate) =>
    PORTABLE_FILE_EXTENSIONS.has(extensionFromFilename(candidate)),
  );
  return matched ? cleanFilename(matched) : null;
}

function isSafeFetchUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr, globalThis.location?.href || 'http://localhost/');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'blob:';
  } catch {
    return false;
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth-token') || key.startsWith('sb-'))) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed?.access_token) return parsed.access_token;
            if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function imageSourceToFile(src: string, alt: string, index: number): Promise<File | null> {
  if (!isSafeFetchUrl(src) && !src.startsWith('data:image/')) return null;

  if (src.startsWith('data:image/')) {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return new File([blob], filenameFromImage(src, alt, blob.type, index), {
        type: blob.type,
        lastModified: Date.now(),
      });
    } catch {
      return null;
    }
  }

  // 1. Thử fetch trực tiếp ở frontend
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(src, {
      credentials: 'omit',
      signal: controller.signal,
      ...(src.startsWith('http') ? { mode: 'cors' as const } : {}),
    });
    clearTimeout(timer);
    if (response.ok) {
      const lengthHeader = response.headers.get('content-length');
      if (!lengthHeader || Number(lengthHeader) <= MAX_SINGLE_FILE_BYTES) {
        const blob = await response.blob();
        if (blob.type.startsWith('image/') && blob.size <= MAX_SINGLE_FILE_BYTES) {
          return new File([blob], filenameFromImage(src, alt, blob.type, index), {
            type: blob.type,
            lastModified: Date.now(),
          });
        }
      }
    }
  } catch {
    // Fallback qua backend proxy
  }

  // 2. Fallback qua backend proxy để vượt qua rào cản CORS (Discord CDN, Google Drive, v.v.)
  try {
    const filename = filenameFromImage(src, alt, 'image/png', index);
    const baseUrl = environment.apiUrl || 'http://localhost:3000/api';
    const token = getAuthToken();
    const response = await fetch(`${baseUrl}/messages/proxy-attachment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url: src, filename }),
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    if (blob.size > MAX_SINGLE_FILE_BYTES) return null;

    const contentType = response.headers.get('content-type') || blob.type || 'image/png';
    return new File([blob], filename, {
      type: contentType,
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
}

async function linkedResourceToFile(href: string, filename: string): Promise<File | null> {
  if (!isSafeFetchUrl(href)) return null;

  // 1. Thử fetch trực tiếp ở frontend
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(href, {
      credentials: 'omit',
      signal: controller.signal,
      ...(href.startsWith('http') ? { mode: 'cors' as const } : {}),
    });
    clearTimeout(timer);
    if (response.ok) {
      const lengthHeader = response.headers.get('content-length');
      if (!lengthHeader || Number(lengthHeader) <= MAX_SINGLE_FILE_BYTES) {
        const blob = await response.blob();
        if (blob.size <= MAX_SINGLE_FILE_BYTES) {
          const extension = extensionFromFilename(filename);
          const type = MIME_BY_EXTENSION[extension] || blob.type || 'application/octet-stream';
          return new File([blob], filename, { type, lastModified: Date.now() });
        }
      }
    }
  } catch {
    // Fallback qua backend proxy
  }

  // 2. Fallback qua backend proxy để vượt qua CORS (Discord CDN, Dropbox, Zalo, Telegram, v.v.)
  try {
    const baseUrl = environment.apiUrl || 'http://localhost:3000/api';
    const token = getAuthToken();
    const response = await fetch(`${baseUrl}/messages/proxy-attachment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url: href, filename }),
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    if (blob.size > MAX_SINGLE_FILE_BYTES) return null;

    const extension = extensionFromFilename(filename);
    const contentType = response.headers.get('content-type');
    const type = contentType || MIME_BY_EXTENSION[extension] || blob.type || 'application/octet-stream';
    return new File([blob], filename, { type, lastModified: Date.now() });
  } catch {
    return null;
  }
}

/**
 * Làm sạch các token thô từ Discord / ứng dụng ngoài thành text an toàn.
 * Loại bỏ các ID thô như <@&123>, <@!123>, <#123> để không để lại rác hoặc tạo mention giả.
 */
export function readableExternalText(text: string): string {
  return text
    .replace(/<@&(\d+)>/g, '')
    .replace(/<@!?(\d+)>/g, '')
    .replace(/<#(\d+)>/g, '')
    .replace(/<t:(\d+)(?::[A-Za-z])?>/g, (_match, unix: string) => {
      const timestamp = Number(unix) * 1000;
      return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString('vi-VN') : '';
    });
}

/**
 * Duyệt cây DOM HTML và chuyển đổi thành cú pháp Markdown chuẩn:
 * - <b>, <code> -> **text**
 * - ...
 */
export function htmlToPortableMarkdown(document: Document): string {
  const root = document.body.cloneNode(true) as HTMLElement;

  // Loại bỏ các thẻ không an toàn hoặc rác
  root.querySelectorAll('script,style,noscript').forEach((node) => node.remove());

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // 1. Nhận diện thẻ mention từ Discord (bất kể cấu trúc class/data-type nào)
    const isMentionWrapper =
      el.classList.contains('mention') ||
      (typeof el.className === 'string' && (
        el.className.includes('mention') ||
        el.className.includes('roleMention') ||
        el.className.includes('userMention') ||
        el.className.includes('channelMention')
      )) ||
      el.getAttribute('data-type') === 'mention' ||
      el.getAttribute('data-type') === 'roleMention' ||
      el.getAttribute('data-type') === 'userMention' ||
      el.hasAttribute('data-role-id') ||
      el.hasAttribute('data-user-id') ||
      el.getAttribute('aria-label')?.startsWith('@');

    if (isMentionWrapper) {
      const rawText = (el.getAttribute('aria-label') || el.textContent || '').trim();
      const clean = rawText.replace(/^@+/, '');
      if (clean) {
        return `@${clean}`;
      }
    }

    // 2. Xử lý thẻ hình ảnh
    if (tag === 'img') {
      const src = (el as HTMLImageElement).getAttribute('src') || '';
      const alt = (el as HTMLImageElement).getAttribute('alt') || 'Ảnh đính kèm';
      if (src && isSafeFetchUrl(src)) {
        return `\n![${alt}](${src})\n`;
      }
      return '';
    }

    // 3. Xử lý các thẻ con đệ quy
    const childrenText = Array.from(el.childNodes)
      .map((child) => processNode(child))
      .join('');

    if (!childrenText.trim() && tag !== 'br') {
      return childrenText;
    }

    switch (tag) {
      case 'b':
      case 'strong':
        return `**${childrenText.trim()}**`;
      case 'i':
      case 'em':
        return `*${childrenText.trim()}*`;
      case 's':
      case 'del':
      case 'strike':
        return `~~${childrenText.trim()}~~`;
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre'
          ? childrenText
          : `\`${childrenText}\``;
      case 'pre': {
        const lang = el.querySelector('code')?.className.match(/language-([a-z0-9]+)/i)?.[1] || '';
        return `\n\`\`\`${lang}\n${childrenText.trim()}\n\`\`\`\n`;
      }
      case 'blockquote':
        return (
          '\n' +
          childrenText
            .trim()
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n') +
          '\n'
        );
      case 'li':
        return `• ${childrenText.trim()}\n`;
      case 'a': {
        const href = (el as HTMLAnchorElement).getAttribute('href') || (el as HTMLAnchorElement).href || '';
        const filename = filenameForLink(el as HTMLAnchorElement);
        const label = childrenText.trim() || filename || href;
        if (href && isSafeFetchUrl(href)) {
          return `[${label}](${href})`;
        }
        return label;
      }
      case 'br':
        return '\n';
      case 'p':
      case 'div':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'section':
      case 'article':
        return `\n${childrenText}\n`;
      default:
        return childrenText;
    }
  }

  const rawMarkdown = processNode(root);
  return readableExternalText(rawMarkdown)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Chuyển clipboard thành payload message an toàn:
 * - Trích xuất text thành Markdown chuẩn.
 * - Trích xuất file nhị phân đính kèm vào `files[]` với giới hạn an toàn.
 * - Cảnh báo khi có tài nguyên bị chặn (CORS/Auth).
 */
export async function extractClipboardMessage(
  clipboard: DataTransfer | null,
): Promise<ClipboardMessagePayload> {
  if (!clipboard) return { text: '', files: [], hasRichContent: false, failedResourceCount: 0 };

  const plainText = clipboard.getData('text/plain') || '';
  let portablePlainText = plainText;
  const html = clipboard.getData('text/html') || '';
  const files: File[] = [];
  const seen = new Set<string>();
  let failedResourceCount = 0;
  let runningBytes = 0;

  const appendFile = (file: File | null): void => {
    if (!file) return;
    if (files.length >= MAX_CLIPBOARD_FILES) return;
    if (file.size > MAX_SINGLE_FILE_BYTES) return;
    if (runningBytes + file.size > MAX_TOTAL_BATCH_BYTES) return;

    const key = fileKey(file);
    if (seen.has(key)) return;

    seen.add(key);
    files.push(file);
    runningBytes += file.size;
  };

  // 1. Trích xuất file trực tiếp từ Clipboard API
  for (const file of Array.from(clipboard.files || [])) appendFile(file);
  for (const item of Array.from(clipboard.items || [])) {
    if (item.kind === 'file') appendFile(item.getAsFile());
  }

  let htmlText = '';
  if (html && typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(html, 'text/html');
    htmlText = htmlToPortableMarkdown(document);

    // Xử lý ảnh trong thẻ <img> nếu chưa có binary file thật
    const hasClipboardImageFile = files.some((file) => file.type.startsWith('image/'));
    const images = Array.from(document.querySelectorAll('img[src]'));

    if (!hasClipboardImageFile && files.length < MAX_CLIPBOARD_FILES) {
      const converted = await Promise.all(
        images.slice(0, MAX_CLIPBOARD_FILES - files.length).map((image, index) =>
          imageSourceToFile(
            image.getAttribute('src') || '',
            image.getAttribute('alt') || '',
            index,
          ),
        ),
      );
      converted.forEach((file, index) => {
        if (file) {
          appendFile(file);
          const src = images[index]?.getAttribute('src') || '';
          if (src) {
            const srcEscaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            htmlText = htmlText.replace(new RegExp(`!\\[[^\\]]*\\]\\(${srcEscaped}\\)`, 'g'), '').trim();
          }
        } else {
          failedResourceCount += 1;
        }
      });
    }

    // Xử lý link tải file (như file PDF/Docx từ Discord/Slack)
    if (files.length < MAX_CLIPBOARD_FILES) {
      const linkedFiles = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .map((link) => ({ link, filename: filenameForLink(link) }))
        .filter((item): item is { link: HTMLAnchorElement; filename: string } => !!item.filename);

      const uniqueLinks = new Map<string, { href: string; filename: string }>();
      linkedFiles.forEach(({ link, filename }) => {
        const href = link.href || link.getAttribute('href') || '';
        if (href && isSafeFetchUrl(href)) uniqueLinks.set(href, { href, filename });
      });

      const remainingSlots = MAX_CLIPBOARD_FILES - files.length;
      const linksToFetch = Array.from(uniqueLinks.values()).slice(0, remainingSlots);

      const convertedLinks = await Promise.all(
        linksToFetch.map(({ href, filename }) => linkedResourceToFile(href, filename)),
      );
      convertedLinks.forEach((file, index) => {
        if (file) {
          appendFile(file);
          const linkInfo = linksToFetch[index];
          if (linkInfo) {
            const hrefEscaped = linkInfo.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            htmlText = htmlText.replace(new RegExp(`\\[[^\\]]*\\]\\(${hrefEscaped}\\)`, 'g'), '').trim();
          }
        } else {
          failedResourceCount += 1;
        }
      });
    }
  } else {
    // Fallback cho text/plain chứa link tải file/ảnh/video trực tiếp hoặc CDN URL
    const fileUrls = Array.from(plainText.matchAll(/https?:\/\/[^\s<>"'`]+/g))
      .map((match) => match[0])
      .map((href) => {
        try {
          const urlObj = new URL(href);
          const rawPath = urlObj.pathname.split('/').pop() || '';
          let filename = cleanFilename(decodeURIComponent(rawPath));
          let ext = extensionFromFilename(filename);
          // If no extension in pathname, check query parameters (e.g. format=png, ext=jpg)
          if (!ext) {
            const formatParam = urlObj.searchParams.get('format') || urlObj.searchParams.get('ext');
            if (formatParam && PORTABLE_FILE_EXTENSIONS.has(formatParam.toLowerCase())) {
              ext = formatParam.toLowerCase();
              filename = `${filename || 'media'}.${ext}`;
            }
          }
          return PORTABLE_FILE_EXTENSIONS.has(ext)
            ? { href, filename: filename || `file-${Date.now()}.${ext}` }
            : null;
        } catch {
          return null;
        }
      })
      .filter((item): item is { href: string; filename: string } => !!item);

    if (fileUrls.length > 0 && files.length < MAX_CLIPBOARD_FILES) {
      const remainingSlots = MAX_CLIPBOARD_FILES - files.length;
      const urlsToFetch = fileUrls.slice(0, remainingSlots);
      const convertedLinks = await Promise.all(
        urlsToFetch.map(({ href, filename }) => linkedResourceToFile(href, filename)),
      );
      convertedLinks.forEach((file, index) => {
        const source = urlsToFetch[index];
        if (file) {
          portablePlainText = portablePlainText.replace(source.href, '').trim();
          appendFile(file);
        } else {
          failedResourceCount += 1;
        }
      });
    }
  }

  const text = htmlText
    ? htmlText
    : readableExternalText(portablePlainText)
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

  return {
    text,
    files,
    hasRichContent: files.length > 0 || /<(?:img|a|strong|b|em|i|code|pre|blockquote)\b/i.test(html),
    failedResourceCount,
  };
}

export function insertTextAtSelection(
  current: string,
  inserted: string,
  start: number,
  end: number,
): { value: string; caret: number } {
  const safeStart = Math.max(0, Math.min(start, current.length));
  const safeEnd = Math.max(safeStart, Math.min(end, current.length));
  const value = `${current.slice(0, safeStart)}${inserted}${current.slice(safeEnd)}`;
  return { value, caret: safeStart + inserted.length };
}
