import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import type { OwnProfile, ProfileLink, UpdateProfileRequest } from '../../../shared';
import {
  APP_PLATFORMS,
  connectedAppFor,
  normalizeHandle,
  platformForLink,
  profileUrlFor,
  type AppPlatform,
} from './connected-apps';
import { linkIconFor } from './components/link-icon';
import { ConnectedAppsService } from './connected-apps.service';
import { ProfileStore } from './profile-store';

function platform(id: string): AppPlatform {
  const found = APP_PLATFORMS.find((p) => p.id === id);
  if (!found) {
    throw new Error(`Không có nền tảng ${id}`);
  }
  return found;
}

const PROFILE: OwnProfile = {
  id: 'u1',
  username: 'testduoc',
  displayName: 'Test Duoc',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: null,
  bio: null,
  location: null,
  links: [],
  games: [],
  mutualFriends: [],
  mutualServers: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: true,
  birthdate: '2001-11-03',
};

function setup(links: ProfileLink[] = []) {
  const sent: UpdateProfileRequest[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ProfilesApiService,
        useValue: {
          getOwn: () => Promise.resolve(PROFILE),
          update: (payload: UpdateProfileRequest) => {
            sent.push(payload);
            return Promise.resolve({ ...PROFILE, links: payload.links ?? [] });
          },
        },
      },
    ],
  });

  const store = TestBed.inject(ProfileStore);
  store.set({ ...PROFILE, links });
  return { apps: TestBed.inject(ConnectedAppsService), store, sent };
}

describe('normalizeHandle', () => {
  const github = platform('github');

  it('bỏ @ và khoảng trắng thừa', () => {
    expect(normalizeHandle(github, '  @ducpham ')).toBe('ducpham');
  });

  it('dán nguyên link trang cá nhân vẫn ra đúng tên', () => {
    expect(normalizeHandle(github, 'https://github.com/ducpham')).toBe('ducpham');
    expect(normalizeHandle(github, 'https://github.com/ducpham/')).toBe('ducpham');
  });

  it('dán link khác dạng (thiếu www, có m.) thì lấy đoạn cuối', () => {
    expect(normalizeHandle(platform('youtube'), 'https://youtube.com/@nexus')).toBe('nexus');
  });
});

describe('platformForLink', () => {
  it('mọi nền tảng dùng SVG local để không bị CSP chặn', () => {
    const urls = APP_PLATFORMS.map((item) => item.logoUrl);

    expect(new Set(urls).size).toBe(APP_PLATFORMS.length);
    for (const item of APP_PLATFORMS) {
      expect(item.logoUrl).toMatch(/^\/assets\/platform-logos\/[a-z0-9-]+\.svg$/);
    }
  });

  it('nhận ra link thuộc nền tảng nào', () => {
    expect(platformForLink({ label: 'GitHub', url: 'https://github.com/a' })?.id).toBe('github');
    expect(platformForLink({ label: 'Steam', url: 'https://steamcommunity.com/id/a' })?.id).toBe(
      'steam',
    );
  });

  it('link tự do thì trả null — không được nuốt mất chúng', () => {
    expect(platformForLink({ label: 'Blog', url: 'https://blog.ca-nhan.vn' })).toBeNull();
  });

  it('đọc ngược được tên tài khoản đã lưu', () => {
    const url = profileUrlFor(platform('steam'), 'NghienKhoPhai 99');
    expect(connectedAppFor({ label: 'Steam', url })?.handle).toBe('NghienKhoPhai 99');
  });
});

describe('ConnectedAppsService', () => {
  it('gắn nền tảng là ghi THẬT vào links của hồ sơ', async () => {
    const { apps, sent, store } = setup();

    expect(await apps.connect(platform('github'), '@ducpham')).toBe(true);

    expect(sent).toHaveLength(1);
    expect(sent[0].links).toEqual([{ label: 'GitHub', url: 'https://github.com/ducpham' }]);
    expect(store.profile()?.links).toHaveLength(1);
    expect(apps.rows()[0].platform?.id).toBe('github');
  });

  it('gỡ nền tảng nhưng giữ nguyên liên kết tự do', async () => {
    const blog: ProfileLink = { label: 'Blog', url: 'https://blog.ca-nhan.vn' };
    const { apps, sent } = setup([{ label: 'GitHub', url: 'https://github.com/a' }, blog]);

    await apps.remove('https://github.com/a');

    expect(sent[0].links).toEqual([blog]);
  });

  /**
   * Liên kết tự do vẫn hiện trên thẻ hồ sơ và vẫn ăn hạn mức. Lọc chúng khỏi
   * danh sách thì người dùng không hiểu vì sao hết chỗ, và cũng không có đường
   * nào gỡ chúng từ tab này.
   */
  it('danh sách kể cả liên kết không thuộc nền tảng nào', () => {
    const { apps } = setup([
      { label: 'GitHub', url: 'https://github.com/a' },
      { label: 'Blog', url: 'https://blog.ca-nhan.vn/bai-viet' },
    ]);

    const rows = apps.rows();
    expect(rows).toHaveLength(2);
    expect(rows[0].platform?.id).toBe('github');
    expect(rows[1].platform).toBeNull();
    expect(rows[1].label).toBe('Blog');
    expect(rows[1].handle).toBe('blog.ca-nhan.vn/bai-viet');
  });

  it('nền tảng đã gắn thì không mời gắn lại', async () => {
    const { apps } = setup([{ label: 'GitHub', url: 'https://github.com/a' }]);

    expect(apps.available().some((p) => p.id === 'github')).toBe(false);
  });

  it('đếm cả liên kết tự do vào hạn mức 5 và từ chối khi đầy', async () => {
    const { apps, sent } = setup([
      { label: 'Blog', url: 'https://a.vn' },
      { label: 'Portfolio', url: 'https://b.vn' },
      { label: 'Shop', url: 'https://c.vn' },
      { label: 'Docs', url: 'https://d.vn' },
      { label: 'Wiki', url: 'https://e.vn' },
    ]);

    expect(apps.otherLinksCount()).toBe(5);
    expect(apps.isFull()).toBe(true);
    expect(await apps.connect(platform('github'), 'ducpham')).toBe(false);
    expect(sent).toHaveLength(0);
    expect(apps.errorMessage()).toContain('5');
  });

  /**
   * Icon phải ra từ danh mục nền tảng, không phải một bảng chép tay thứ hai —
   * lệch nhau là tab cài đặt vẽ một icon còn thẻ hồ sơ vẽ icon khác.
   */
  it('icon trên thẻ hồ sơ khớp icon trong danh mục', () => {
    for (const p of APP_PLATFORMS) {
      expect(linkIconFor(profileUrlFor(p, 'abc'))).toBe(p.icon);
    }
    expect(linkIconFor('https://blog.ca-nhan.vn')).toBe('link');
  });

  it('nhóm Đề xuất chỉ chứa nền tảng phổ biến ở VN và chưa gắn', () => {
    const { apps } = setup([{ label: 'Zalo', url: 'https://zalo.me/0912345678' }]);

    const ids = apps.recommended().map((p) => p.id);
    expect(ids).toContain('facebook');
    expect(ids).toContain('tiktok');
    // Đã gắn rồi thì không mời gắn lại.
    expect(ids).not.toContain('zalo');
    expect(apps.recommended().every((p) => p.recommended)).toBe(true);
  });

  it('thêm được liên kết bất kỳ cho nền tảng ngoài danh mục', async () => {
    const { apps, sent } = setup();

    expect(await apps.connectCustom('Portfolio', 'https://duoc.dev')).toBe(true);
    expect(sent[0].links).toEqual([{ label: 'Portfolio', url: 'https://duoc.dev' }]);
  });

  it('chặn địa chỉ không phải https — backend và database đều từ chối', async () => {
    const { apps, sent } = setup();

    expect(await apps.connectCustom('Xấu', 'javascript:alert(1)')).toBe(false);
    expect(await apps.connectCustom('Xấu', 'http://khong-an-toan.vn')).toBe(false);
    expect(await apps.connectCustom('', 'https://duoc.dev')).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('bỏ trống tên tài khoản thì báo lỗi, không gọi API', async () => {
    const { apps, sent } = setup();

    expect(await apps.connect(platform('github'), '   ')).toBe(false);
    expect(sent).toHaveLength(0);
    expect(apps.errorMessage()).toBeTruthy();
  });
});
