import { describe, it, expect } from 'vitest';
import {
  parseMessageContent,
  extractMentionUsernames,
  isMentioningUser,
  isMentioningEveryone,
} from './message-content-parser';

describe('MessageContentParser (Pure Markdown & Safe Linkification)', () => {
  it('giữ nguyên văn bản thông thường không chứa ký tự đặc biệt', () => {
    const text = 'Xin chào thế giới NexusCord!';
    const tokens = parseMessageContent(text, 'test');
    expect(tokens).toEqual([
      {
        key: 'test-tok-0-text',
        type: 'text',
        value: 'Xin chào thế giới NexusCord!',
      },
    ]);
  });

  it('phân tách chính xác chữ in đậm (bold) **...**', () => {
    const text = 'Nội dung **rất quan trọng** cần đọc';
    const tokens = parseMessageContent(text, 'test');
    const boldToken = tokens.find((t) => t.type === 'bold');
    expect(boldToken).toBeDefined();
    expect(boldToken?.value).toBe('rất quan trọng');
  });

  it('phân tách chính xác in nghiêng (italic) *...*', () => {
    const text = 'Nội dung *chú ý* nhé';
    const tokens = parseMessageContent(text, 'test');
    const italicToken = tokens.find((t) => t.type === 'italic');
    expect(italicToken).toBeDefined();
    expect(italicToken?.value).toBe('chú ý');
  });

  it('phân tách chính xác gạch ngang (strike) ~~...~~', () => {
    const text = 'Giá cũ: ~~100k~~ chỉ còn 50k';
    const tokens = parseMessageContent(text, 'test');
    const strikeToken = tokens.find((t) => t.type === 'strike');
    expect(strikeToken).toBeDefined();
    expect(strikeToken?.value).toBe('100k');
  });

  it('hỗ trợ nested formatting: in đậm chứa in nghiêng **đậm *nghiêng***', () => {
    const text = 'Đây là **đậm và *nghiêng* luôn** nhé';
    const tokens = parseMessageContent(text, 'test');
    const boldToken = tokens.find((t) => t.type === 'bold');
    expect(boldToken).toBeDefined();
    expect(boldToken?.children).toBeDefined();
    const nestedItalic = boldToken?.children?.find((c) => c.type === 'italic');
    expect(nestedItalic).toBeDefined();
    expect(nestedItalic?.value).toBe('nghiêng');
  });

  it('phân tách inline code `...` không làm biến dạng ký tự bên trong', () => {
    const text = 'Chạy lệnh `npm run start:dev` để khởi động';
    const tokens = parseMessageContent(text, 'test');
    const codeToken = tokens.find((t) => t.type === 'inline-code');
    expect(codeToken).toBeDefined();
    expect(codeToken?.value).toBe('npm run start:dev');
  });

  it('phân tách code block ```lang\ncode\n```', () => {
    const text = 'Đoạn mã:\n```typescript\nconst x: number = 42;\n```';
    const tokens = parseMessageContent(text, 'test');
    const cbToken = tokens.find((t) => t.type === 'code-block');
    expect(cbToken).toBeDefined();
    expect(cbToken?.language).toBe('typescript');
    expect(cbToken?.value).toContain('const x: number = 42;');
  });

  it('phân tách Markdown Link [label](url) an toàn', () => {
    const text = 'Truy cập [Trang chủ](https://nexuscord.app) để xem';
    const tokens = parseMessageContent(text, 'test');
    const mdLink = tokens.find((t) => t.type === 'md-link');
    expect(mdLink).toBeDefined();
    expect(mdLink?.value).toBe('Trang chủ');
    expect(mdLink?.url).toBe('https://nexuscord.app');
  });

  it('chặn scheme nguy hiểm javascript: và render dạng text thuần', () => {
    const text = 'Bấm vào javascript:alert(document.cookie) đi bạn';
    const tokens = parseMessageContent(text, 'test');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('text');
    expect(tokens[0].value).toBe('Bấm vào javascript:alert(document.cookie) đi bạn');
  });

  it('phân tách blockquote > ...', () => {
    const text = '> Đây là một đoạn trích dẫn';
    const tokens = parseMessageContent(text, 'test');
    const quoteToken = tokens.find((t) => t.type === 'quote');
    expect(quoteToken).toBeDefined();
    expect(quoteToken?.value).toBe('Đây là một đoạn trích dẫn');
  });

  it('phân tách Markdown Image ![alt](url) an toàn', () => {
    const text = 'Xem ảnh: ![Hình minh họa](https://cdn.discordapp.com/attachments/123/photo.png)';
    const tokens = parseMessageContent(text, 'test');
    const imgToken = tokens.find((t) => t.type === 'image');
    expect(imgToken).toBeDefined();
    expect(imgToken?.value).toBe('Hình minh họa');
    expect(imgToken?.url).toBe('https://cdn.discordapp.com/attachments/123/photo.png');
  });

  describe('Mention Parsing', () => {
    it('biến @vai-trò hay @Web26A thành text thuần túy thay vì tạo mention badge giả', () => {
      const text = '@Web26A-246 và @vai-trò';
      const tokens = parseMessageContent(text, 'test');
      const mentions = tokens.filter((t) => t.type === 'mention');
      expect(mentions).toHaveLength(0);
      expect(tokens.every((t) => t.type === 'text')).toBe(true);
    });

    it('nhận diện @everyone với flag isEveryone: true', () => {
      const text = 'Thông báo tới @everyone trong server';
      const tokens = parseMessageContent(text, 'test');
      const mention = tokens.find((t) => t.type === 'mention');
      expect(mention).toBeDefined();
      expect(mention?.value).toBe('everyone');
      expect(mention?.isEveryone).toBe(true);
    });

    it('trích xuất username chính xác qua extractMentionUsernames', () => {
      const text = 'Chào @minhtai và @alex nhé';
      const usernames = extractMentionUsernames(text);
      expect(usernames).toEqual(['minhtai', 'alex']);
      expect(isMentioningUser(text, 'minhtai')).toBe(true);
      expect(isMentioningUser(text, 'other')).toBe(false);
      expect(isMentioningEveryone(text)).toBe(false);
    });
  });
});
