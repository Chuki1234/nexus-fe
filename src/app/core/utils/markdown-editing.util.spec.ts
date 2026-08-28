import { describe, it, expect, vi } from 'vitest';
import { applyMarkdownFormat, handleMarkdownHotkeys } from './markdown-editing.util';

describe('markdown-editing utility', () => {
  it('áp dụng in đậm (bold) cho vùng chọn', () => {
    const text = 'Xin chào thế giới';
    // Bôi đen 'thế giới' (vị trí 9 đến 17)
    const result = applyMarkdownFormat(text, 9, 17, 'bold');
    expect(result.value).toBe('Xin chào **thế giới**');
    expect(result.selectionStart).toBe(11);
    expect(result.selectionEnd).toBe(19);
  });

  it('toggle gỡ bỏ in đậm nếu vùng chọn đã có ** bao quanh', () => {
    const text = 'Xin chào **thế giới**';
    const result = applyMarkdownFormat(text, 9, 21, 'bold');
    expect(result.value).toBe('Xin chào thế giới');
    expect(result.selectionStart).toBe(9);
    expect(result.selectionEnd).toBe(17);
  });

  it('áp dụng in nghiêng (italic) cho vùng chọn', () => {
    const text = 'Một hai ba';
    const result = applyMarkdownFormat(text, 4, 7, 'italic');
    expect(result.value).toBe('Một *hai* ba');
  });

  it('áp dụng inline-code cho vùng chọn', () => {
    const text = 'Sử dụng const x = 1 trong js';
    const result = applyMarkdownFormat(text, 8, 19, 'inline-code');
    expect(result.value).toBe('Sử dụng `const x = 1` trong js');
  });

  it('chèn placeholder khi không có vùng chọn', () => {
    const text = 'Bắt đầu: ';
    const result = applyMarkdownFormat(text, 9, 9, 'bold');
    expect(result.value).toBe('Bắt đầu: **văn bản đậm**');
    expect(result.selectionStart).toBe(11);
    expect(result.selectionEnd).toBe(22);
  });

  it('áp dụng trích dẫn (quote) cho nhiều dòng', () => {
    const text = 'Dòng 1\nDòng 2';
    const result = applyMarkdownFormat(text, 0, text.length, 'quote');
    expect(result.value).toBe('> Dòng 1\n> Dòng 2');
  });

  it('bắt phím tắt Ctrl+B để in đậm', () => {
    const textarea = {
      value: 'Hello World',
      selectionStart: 6,
      selectionEnd: 11,
    } as unknown as HTMLTextAreaElement;

    const event = {
      ctrlKey: true,
      metaKey: false,
      key: 'b',
      shiftKey: false,
      altKey: false,
      isComposing: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    let callbackResult: any = null;
    const handled = handleMarkdownHotkeys(event, textarea, (res) => {
      callbackResult = res;
    });

    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(callbackResult.value).toBe('Hello **World**');
  });

  it('bỏ qua phím tắt khi đang gõ IME tiếng Việt (isComposing = true)', () => {
    const textarea = {
      value: 'Đang gõ',
      selectionStart: 0,
      selectionEnd: 7,
    } as unknown as HTMLTextAreaElement;

    const event = {
      ctrlKey: true,
      metaKey: false,
      key: 'b',
      shiftKey: false,
      altKey: false,
      isComposing: true,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    let callbackCalled = false;
    const handled = handleMarkdownHotkeys(event, textarea, () => {
      callbackCalled = true;
    });

    expect(handled).toBe(false);
    expect(callbackCalled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
