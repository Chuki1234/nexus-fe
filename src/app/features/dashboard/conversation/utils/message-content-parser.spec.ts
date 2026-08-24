import { parseMessageContent } from './message-content-parser';

describe('MessageContentParser (Safe Linkification & Scheme Whitelisting)', () => {
  it('giữ nguyên văn bản thông thường không chứa link', () => {
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

  it('phân tách chính xác URL https:// và phần text xung quanh', () => {
    const text = 'Hãy truy cập https://nexuscord.app để tải app.';
    const tokens = parseMessageContent(text, 'test');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      key: expect.any(String),
      type: 'text',
      value: 'Hãy truy cập ',
    });
    expect(tokens[1]).toEqual({
      key: expect.any(String),
      type: 'link',
      value: 'https://nexuscord.app',
      url: 'https://nexuscord.app/',
    });
    expect(tokens[2]).toEqual({
      key: expect.any(String),
      type: 'text',
      value: ' để tải app.',
    });
  });

  it('tách đúng dấu câu cuối câu (dấu chấm, phẩy, chấm hỏi, ngoặc đơn) ra khỏi URL', () => {
    const text = 'Xem chi tiết tại (https://example.com/docs).';
    const tokens = parseMessageContent(text, 'test');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      key: expect.any(String),
      type: 'text',
      value: 'Xem chi tiết tại (',
    });
    expect(tokens[1]).toEqual({
      key: expect.any(String),
      type: 'link',
      value: 'https://example.com/docs',
      url: 'https://example.com/docs',
    });
    expect(tokens[2]).toEqual({
      key: expect.any(String),
      type: 'text',
      value: ').',
    });
  });

  it('chặn scheme nguy hiểm javascript: và render dạng text thuần', () => {
    const text = 'Bấm vào javascript:alert(document.cookie) đi bạn';
    const tokens = parseMessageContent(text, 'test');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('text');
    expect(tokens[0].value).toBe('Bấm vào javascript:alert(document.cookie) đi bạn');
  });

  it('chặn scheme nguy hiểm data:, file:, vbscript: và render dạng text thuần', () => {
    const text = 'Thử data:text/html,<script> và file:///C:/secret và vbscript:msgbox';
    const tokens = parseMessageContent(text, 'test');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('text');
    expect(tokens[0].value).toBe('Thử data:text/html,<script> và file:///C:/secret và vbscript:msgbox');
  });

  it('hỗ trợ nhiều liên kết http và https trong cùng một tin nhắn', () => {
    const text = 'Link 1: http://site-one.com và Link 2: https://site-two.org/api?v=2';
    const tokens = parseMessageContent(text, 'test');
    const links = tokens.filter((t) => t.type === 'link');
    expect(links).toHaveLength(2);
    expect(links[0].value).toBe('http://site-one.com');
    expect(links[1].value).toBe('https://site-two.org/api?v=2');
  });

  it('hỗ trợ URL chứa query params dài và Unicode path', () => {
    const text = 'Tài liệu: https://example.com/search?q=B%C3%A1o+c%C3%A1o&page=1&limit=50';
    const tokens = parseMessageContent(text, 'test');
    const link = tokens.find((t) => t.type === 'link');
    expect(link).toBeDefined();
    expect(link?.value).toBe('https://example.com/search?q=B%C3%A1o+c%C3%A1o&page=1&limit=50');
  });

  it('trả về mảng rỗng khi content rỗng hoặc null/undefined', () => {
    expect(parseMessageContent('', 'test')).toEqual([]);
  });
});
