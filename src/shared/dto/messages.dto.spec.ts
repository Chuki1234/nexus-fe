import { canEditMessage, MESSAGE_EDIT_WINDOW_MS } from './messages.dto';

describe('canEditMessage policy', () => {
  const currentUserId = 'user-123';
  const now = 1700000000000;

  it('hằng số MESSAGE_EDIT_WINDOW_MS là đúng 5 phút (300,000ms)', () => {
    expect(MESSAGE_EDIT_WINDOW_MS).toBe(5 * 60 * 1000);
    expect(MESSAGE_EDIT_WINDOW_MS).toBe(300000);
  });

  it('cho phép chỉnh sửa tin nhắn của chính mình trong vòng dưới 5 phút', () => {
    const createdAt = new Date(now - 4 * 60 * 1000).toISOString(); // 4 phút trước
    const msg = {
      authorId: currentUserId,
      createdAt,
      deletedAt: null,
      type: 'default',
      content: 'Nội dung hợp lệ',
    };

    expect(canEditMessage(msg, currentUserId, now)).toBe(true);
  });

  it('tại đúng boundary 5 phút (createdAt + 300000 === nowMs): hết hạn và trả về false', () => {
    const createdAt = new Date(now - 300000).toISOString(); // đúng 5 phút trước
    const msg = {
      authorId: currentUserId,
      createdAt,
      deletedAt: null,
      type: 'default',
      content: 'Nội dung boundary',
    };

    expect(canEditMessage(msg, currentUserId, now)).toBe(false);
  });

  it('sau 5 phút (now > createdAt + 300000): hết hạn và trả về false', () => {
    const createdAt = new Date(now - 300001).toISOString(); // 5 phút 1 mili-giây trước
    const msg = {
      authorId: currentUserId,
      createdAt,
      deletedAt: null,
      type: 'default',
      content: 'Nội dung quá hạn',
    };

    expect(canEditMessage(msg, currentUserId, now)).toBe(false);
  });

  it('từ chối khi tin nhắn thuộc người khác (authorId !== currentUserId)', () => {
    const createdAt = new Date(now - 1000).toISOString();
    const msg = {
      authorId: 'other-user',
      createdAt,
      deletedAt: null,
      type: 'default',
      content: 'Nội dung',
    };

    expect(canEditMessage(msg, currentUserId, now)).toBe(false);
  });

  it('từ chối khi tin nhắn đã bị xóa (deletedAt != null)', () => {
    const createdAt = new Date(now - 1000).toISOString();
    const msg = {
      authorId: currentUserId,
      createdAt,
      deletedAt: new Date(now - 500).toISOString(),
      type: 'default',
      content: 'Nội dung',
    };

    expect(canEditMessage(msg, currentUserId, now)).toBe(false);
  });

  it('từ chối loại tin nhắn hệ thống không cho phép sửa text', () => {
    const createdAt = new Date(now - 1000).toISOString();
    const msg = {
      authorId: currentUserId,
      createdAt,
      deletedAt: null,
      type: 'system_join',
      content: 'User joined',
    };

    expect(canEditMessage(msg, currentUserId, now)).toBe(false);
  });

  it('xử lý an toàn khi message null hoặc timestamp không hợp lệ', () => {
    expect(canEditMessage(null, currentUserId, now)).toBe(false);
    expect(canEditMessage(undefined, currentUserId, now)).toBe(false);
    expect(canEditMessage({ authorId: currentUserId, createdAt: 'invalid-date' }, currentUserId, now)).toBe(false);
    expect(canEditMessage({ authorId: currentUserId, createdAt: null }, currentUserId, now)).toBe(false);
  });
});
