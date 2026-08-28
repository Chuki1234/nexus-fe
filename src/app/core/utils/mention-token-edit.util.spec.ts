import { deleteMentionTokenAtomically } from './mention-token-edit.util';

describe('deleteMentionTokenAtomically', () => {
  it('Backspace ngay sau khoảng trắng tự sinh xoá cả @username và khoảng trắng', () => {
    expect(deleteMentionTokenAtomically('Chào @minhtai bạn', 14, 14, 'Backspace')).toEqual({
      value: 'Chào bạn',
      caret: 5,
    });
  });

  it('Backspace khi con trỏ đang nằm giữa @everyone vẫn xoá cả token', () => {
    expect(deleteMentionTokenAtomically('A @everyone B', 7, 7, 'Backspace')).toEqual({
      value: 'A B',
      caret: 2,
    });
  });

  it('Delete ở đầu token xoá nguyên @username', () => {
    expect(deleteMentionTokenAtomically('@alex_dev tiếp', 0, 0, 'Delete')).toEqual({
      value: 'tiếp',
      caret: 0,
    });
  });

  it('vùng chọn chạm một phần mention được mở rộng theo toàn bộ tag', () => {
    expect(deleteMentionTokenAtomically('Xin @minhtai chào', 6, 9, 'Backspace')).toEqual({
      value: 'Xin  chào',
      caret: 4,
    });
  });

  it('không can thiệp text thường, email hoặc mention đang gõ quá ngắn', () => {
    expect(deleteMentionTokenAtomically('abc', 3, 3, 'Backspace')).toBeNull();
    expect(deleteMentionTokenAtomically('a@b.com', 7, 7, 'Backspace')).toBeNull();
    expect(deleteMentionTokenAtomically('@ab', 3, 3, 'Backspace')).toBeNull();
  });
});
