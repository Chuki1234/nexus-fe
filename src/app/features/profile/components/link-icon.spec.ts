import { linkIconFor, prettyUrl } from './link-icon';

describe('linkIconFor', () => {
  it('nhận ra các tên miền quen thuộc', () => {
    expect(linkIconFor('https://github.com/ducpham')).toBe('code');
    expect(linkIconFor('https://www.youtube.com/@nexus')).toBe('smart_display');
    expect(linkIconFor('https://x.com/nexus')).toBe('chat');
    expect(linkIconFor('https://twitter.com/nexus')).toBe('chat');
  });

  it('bỏ tiền tố www trước khi tra bảng', () => {
    expect(linkIconFor('https://www.github.com/ducpham')).toBe('code');
  });

  it('tên miền lạ thì rơi về icon mắt xích', () => {
    expect(linkIconFor('https://blog.ca-nhan.vn')).toBe('link');
  });

  it('URL gõ dở không làm vỡ hàm — trang sửa hồ sơ gọi trên từng ký tự', () => {
    expect(linkIconFor('https://')).toBe('link');
    expect(linkIconFor('không phải url')).toBe('link');
    expect(linkIconFor('')).toBe('link');
  });
});

describe('prettyUrl', () => {
  it('bỏ https:// và dấu gạch chéo cuối', () => {
    expect(prettyUrl('https://github.com/ducpham/')).toBe('github.com/ducpham');
  });
});
