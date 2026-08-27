import {
  parseMessageContent,
  extractMentionUsernames,
  isMentioningUser,
  isMentioningEveryone,
} from './message-content-parser';

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
    expect(parseMessageContent(null, 'test')).toEqual([]);
    expect(parseMessageContent(undefined, 'test')).toEqual([]);
  });

  describe('Mention Parsing & Fast Path & Anti-XSS/Anti-Email', () => {
    it('fast path: parse chính xác tin nhắn chỉ chứa mention @username mà không có URL', () => {
      const text = '@minhtai';
      const tokens = parseMessageContent(text, 'test');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        key: expect.any(String),
        type: 'mention',
        value: 'minhtai',
        isEveryone: false,
      });
    });

    it('mention token.value chỉ chứa username, không chứa ký tự @', () => {
      const text = 'Chào @alex_dev và @john.doe nhé';
      const tokens = parseMessageContent(text, 'test');
      const mentions = tokens.filter((t) => t.type === 'mention');
      expect(mentions).toHaveLength(2);
      expect(mentions[0].value).toBe('alex_dev');
      expect(mentions[1].value).toBe('john.doe');
      expect(mentions[0].value.startsWith('@')).toBe(false);
      expect(mentions[1].value.startsWith('@')).toBe(false);
    });

    it('nhận diện @everyone với flag isEveryone: true', () => {
      const text = 'Thông báo tới @everyone trong server';
      const tokens = parseMessageContent(text, 'test');
      const mention = tokens.find((t) => t.type === 'mention');
      expect(mention).toBeDefined();
      expect(mention?.value).toBe('everyone');
      expect(mention?.isEveryone).toBe(true);
    });

    it('tách đúng dấu câu sau mention (phẩy, chấm, chấm hỏi, ngoặc đơn)', () => {
      const text = 'Này (@minhtai), bạn đã nộp bài chưa? Gặp @tai.nguyen.';
      const tokens = parseMessageContent(text, 'test');
      const mentions = tokens.filter((t) => t.type === 'mention');
      expect(mentions).toHaveLength(2);
      expect(mentions[0].value).toBe('minhtai');
      expect(mentions[1].value).toBe('tai.nguyen');

      // Đảm bảo dấu ngoặc và dấu chấm được giữ nguyên trong text
      const fullReconstructed = tokens.map((t) => (t.type === 'mention' ? `@${t.value}` : t.value)).join('');
      expect(fullReconstructed).toBe(text);
    });

    it('KHÔNG nhận diện nhầm địa chỉ email là mention', () => {
      const text = 'Gửi thư về contact@example.com hoặc support@nexuscord.app';
      const tokens = parseMessageContent(text, 'test');
      const mentions = tokens.filter((t) => t.type === 'mention');
      expect(mentions).toHaveLength(0);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('text');
      expect(tokens[0].value).toBe(text);
    });

    it('KHÔNG nhận diện ký tự @ nằm giữa một từ hoặc không có khoảng trắng phía trước', () => {
      const text = 'foo@bar abc@123';
      const tokens = parseMessageContent(text, 'test');
      const mentions = tokens.filter((t) => t.type === 'mention');
      expect(mentions).toHaveLength(0);
    });

    it('parse kết hợp đồng thời URL và @username trong cùng tin nhắn', () => {
      const text = 'Xem link https://nexuscord.app này nhé @minhtai';
      const tokens = parseMessageContent(text, 'test');
      const link = tokens.find((t) => t.type === 'link');
      const mention = tokens.find((t) => t.type === 'mention');
      expect(link).toBeDefined();
      expect(link?.value).toBe('https://nexuscord.app');
      expect(mention).toBeDefined();
      expect(mention?.value).toBe('minhtai');
    });

    it('extractMentionUsernames trích xuất danh sách username không trùng lặp và viết thường', () => {
      const text = 'Alo @MinhTai và @minhtai cùng @Everyone xem nhé';
      const extracted = extractMentionUsernames(text);
      expect(extracted).toEqual(['minhtai', 'everyone']);
    });

    it('isMentioningUser và isMentioningEveryone kiểm tra chuẩn xác', () => {
      const text = 'Chào @MinhTai và @everyone!';
      expect(isMentioningUser(text, 'minhtai')).toBe(true);
      expect(isMentioningUser(text, 'MINHTAI')).toBe(true);
      expect(isMentioningUser(text, 'other_user')).toBe(false);
      expect(isMentioningEveryone(text)).toBe(true);
      expect(isMentioningEveryone('Tin nhắn bình thường')).toBe(false);
    });
    it('phân tách chính xác cú pháp spoiler ||nội dung||', () => {
      const text = 'Xem đoạn kết: ||nhân vật chính đã thắng|| nhé!';
      const tokens = parseMessageContent(text, 'test');
      const spoiler = tokens.find((t) => t.type === 'spoiler');
      expect(spoiler).toBeDefined();
      expect(spoiler?.value).toBe('nhân vật chính đã thắng');
    });
  });
});
