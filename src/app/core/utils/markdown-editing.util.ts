export type MarkdownFormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'inline-code'
  | 'code-block'
  | 'quote'
  | 'link';

export interface MarkdownEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface FormatDelimiters {
  prefix: string;
  suffix: string;
  placeholder: string;
  isBlock?: boolean;
}

const FORMAT_DELIMITERS: Record<MarkdownFormatType, FormatDelimiters> = {
  bold: { prefix: '**', suffix: '**', placeholder: 'văn bản đậm' },
  italic: { prefix: '*', suffix: '*', placeholder: 'văn bản nghiêng' },
  underline: { prefix: '__', suffix: '__', placeholder: 'văn bản gạch dưới' },
  strike: { prefix: '~~', suffix: '~~', placeholder: 'văn bản gạch ngang' },
  'inline-code': { prefix: '`', suffix: '`', placeholder: 'mã' },
  'code-block': { prefix: '```\n', suffix: '\n```', placeholder: 'mã nguồn', isBlock: true },
  quote: { prefix: '> ', suffix: '', placeholder: 'trích dẫn', isBlock: true },
  link: { prefix: '[', suffix: '](https://)', placeholder: 'tiêu đề liên kết' },
};

/**
 * Áp dụng hoặc gỡ bỏ định dạng Markdown trên nội dung của `<textarea>` dựa theo vùng chọn hiện tại.
 */
export function applyMarkdownFormat(
  currentText: string,
  selectionStart: number,
  selectionEnd: number,
  format: MarkdownFormatType,
  customLinkUrl?: string,
): MarkdownEditResult {
  const start = Math.max(0, Math.min(selectionStart, currentText.length));
  const end = Math.max(start, Math.min(selectionEnd, currentText.length));
  const selectedText = currentText.slice(start, end);

  const delimiter = FORMAT_DELIMITERS[format];
  if (!delimiter) {
    return { value: currentText, selectionStart: start, selectionEnd: end };
  }

  // Xử lý link đặc biệt nếu có customLinkUrl
  let prefix = delimiter.prefix;
  let suffix = delimiter.suffix;
  if (format === 'link' && customLinkUrl) {
    suffix = `](${customLinkUrl})`;
  }

  // 1. Kiểm tra xem vùng chọn có đang nằm trong đúng cú pháp này để toggle gỡ bỏ không
  if (selectedText.length > 0) {
    if (
      selectedText.startsWith(prefix) &&
      suffix.length > 0 &&
      selectedText.endsWith(suffix) &&
      selectedText.length >= prefix.length + suffix.length
    ) {
      // Toggle gỡ bỏ format bên trong selection
      const unwrapped = selectedText.slice(prefix.length, selectedText.length - suffix.length);
      const nextValue = currentText.slice(0, start) + unwrapped + currentText.slice(end);
      return {
        value: nextValue,
        selectionStart: start,
        selectionEnd: start + unwrapped.length,
      };
    }

    // Kiểm tra bao quanh bên ngoài selection
    const beforeSelection = currentText.slice(0, start);
    const afterSelection = currentText.slice(end);
    if (
      beforeSelection.endsWith(prefix) &&
      suffix.length > 0 &&
      afterSelection.startsWith(suffix)
    ) {
      const nextValue =
        beforeSelection.slice(0, beforeSelection.length - prefix.length) +
        selectedText +
        afterSelection.slice(suffix.length);
      const newStart = start - prefix.length;
      return {
        value: nextValue,
        selectionStart: newStart,
        selectionEnd: newStart + selectedText.length,
      };
    }
  }

  // 2. Xử lý Blockquote riêng: thêm '> ' vào đầu mỗi dòng
  if (format === 'quote') {
    const textToQuote = selectedText.length > 0 ? selectedText : delimiter.placeholder;
    const quotedLines = textToQuote
      .split('\n')
      .map((line) => (line.startsWith('> ') ? line.slice(2) : `> ${line}`))
      .join('\n');

    const nextValue = currentText.slice(0, start) + quotedLines + currentText.slice(end);
    return {
      value: nextValue,
      selectionStart: start,
      selectionEnd: start + quotedLines.length,
    };
  }

  // 3. Áp dụng format thông thường
  if (selectedText.length > 0) {
    const wrapped = `${prefix}${selectedText}${suffix}`;
    const nextValue = currentText.slice(0, start) + wrapped + currentText.slice(end);
    return {
      value: nextValue,
      selectionStart: start + prefix.length,
      selectionEnd: start + prefix.length + selectedText.length,
    };
  }

  // 4. Nếu không có selection, chèn placeholder và bôi đen placeholder
  const placeholder = delimiter.placeholder;
  const wrapped = `${prefix}${placeholder}${suffix}`;
  const nextValue = currentText.slice(0, start) + wrapped + currentText.slice(end);
  return {
    value: nextValue,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + placeholder.length,
  };
}

/**
 * Bắt phím tắt soạn thảo Markdown (Ctrl/Cmd + B, I, K, E) an toàn.
 * Tránh can thiệp khi đang gõ IME (tiếng Việt/Nhật) hoặc khi phím xung đột.
 */
export function handleMarkdownHotkeys(
  event: KeyboardEvent,
  textarea: HTMLTextAreaElement,
  onApply: (result: MarkdownEditResult) => void,
): boolean {
  if (event.isComposing) return false;

  const isMod = event.ctrlKey || event.metaKey;
  if (!isMod) return false;

  const key = event.key.toLowerCase();
  let format: MarkdownFormatType | null = null;

  if (key === 'b' && !event.shiftKey && !event.altKey) {
    format = 'bold';
  } else if (key === 'i' && !event.shiftKey && !event.altKey) {
    format = 'italic';
  } else if (key === 'u' && !event.shiftKey && !event.altKey) {
    format = 'underline';
  } else if (key === 'k' && !event.shiftKey && !event.altKey) {
    format = 'link';
  } else if (key === 'e' && !event.shiftKey && !event.altKey) {
    format = 'inline-code';
  } else if (key === 'x' && event.shiftKey && !event.altKey) {
    format = 'strike';
  }

  if (format) {
    event.preventDefault();
    const result = applyMarkdownFormat(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
    );
    onApply(result);
    return true;
  }

  return false;
}
