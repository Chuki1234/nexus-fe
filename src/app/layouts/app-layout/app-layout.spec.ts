import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ServersApiService } from '../../core/api/servers-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/profile/profile.service';
import { dashboardRoutes } from '../../features/dashboard/dashboard.routes';

class AuthServiceStub {
  whenReady = () => Promise.resolve();
  isAuthenticated = () => true;
  user = () => ({ id: 'u1', email: 'ban@vidu.com' });
  accessToken = () => 'token';
  signOut = () => Promise.resolve();
}

class ProfileServiceStub {
  ensureLoaded = () => Promise.resolve(true);
  current = () => ({
    id: 'u1',
    username: 'minhtai',
    displayName: 'Minh Tài',
    email: 'ban@vidu.com',
    dateOfBirth: '2000-01-01',
  });
  reset = () => undefined;
}

class ServersApiServiceStub {
  createServer = () =>
    Promise.resolve({
      server: { id: 's1', name: 'Server 1', iconUrl: null, unread: false, mentionCount: 0 },
      defaultChannel: {
        id: 'c1',
        name: 'chung',
        type: 'text' as const,
        topic: null,
        unread: false,
        mentionCount: 0,
      },
    });
  listServers = () => Promise.resolve([]);
}

describe('AppLayout', () => {
  let harness: RouterTestingHarness;

  const text = () => harness.routeNativeElement!.ownerDocument.body.textContent ?? '';
  const query = (selector: string) =>
    harness.routeNativeElement!.ownerDocument.body.querySelector(selector);
  const queryAll = (selector: string) =>
    Array.from(harness.routeNativeElement!.ownerDocument.body.querySelectorAll(selector));

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'channels', children: dashboardRoutes }]),
        { provide: AuthService, useValue: new AuthServiceStub() },
        { provide: ProfileService, useValue: new ProfileServiceStub() },
        { provide: ServersApiService, useValue: new ServersApiServiceStub() },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('dựng đủ server rail và sidebar theo cấu trúc hiện có', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('app-server-rail')).toBeTruthy();
    expect(query('app-channel-sidebar')).toBeTruthy();
    expect(query('.dashboard-nav-shell')).toBeTruthy();
    expect(query('.dashboard-workspace')).toBeTruthy();
    expect(query('.dashboard-nav-shell')?.classList.contains('overflow-hidden')).toBe(true);
    expect(query('.dashboard-workspace')?.classList.contains('h-full')).toBe(true);
    expect(query('.dashboard-content')).toBeTruthy();
    expect(query('.dashboard-shell')?.getAttribute('data-atmosphere')).toBe('hybrid');
  });

  it('gắn Atmosphere đã lưu lên toàn bộ Dashboard shell', async () => {
    localStorage.setItem('nexuscord-dashboard-atmosphere', 'sage');

    await harness.navigateByUrl('/channels/@me');

    expect(query('.dashboard-shell')?.getAttribute('data-atmosphere')).toBe('sage');
  });

  it('tài khoản mới có danh sách bạn bè, DM và hoạt động đều rỗng', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(text()).toContain('Danh sách đang trống');
    expect(text()).toContain('Chưa có cuộc trò chuyện');
    expect(text()).toContain('Hiện khá yên tĩnh');
    expect(queryAll('app-friend-row').length).toBe(0);
    expect(queryAll('[data-server-id]').length).toBe(0);
  });

  it('server rail vẫn có DM, tìm kiếm và thêm server khi dữ liệu rỗng', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('a[href="/channels/@me"]')).toBeTruthy();
    expect(query('[data-action="global-search"]')).toBeTruthy();
    expect(query('button[aria-label="Thêm máy chủ"]')).toBeTruthy();
  });

  it('route cuộc trò chuyện không có dữ liệu báo lỗi rõ ràng', async () => {
    await harness.navigateByUrl('/channels/@me/khong-co-that');

    expect(text()).toContain('Không tìm thấy cuộc trò chuyện này');
  });

  it('route kênh không có dữ liệu không dựng composer hoặc wallpaper giả', async () => {
    await harness.navigateByUrl('/channels/server-chua-tai/kenh-chua-tai');

    expect(text()).toContain('Không tìm thấy kênh này');
    expect(query('app-message-composer')).toBeFalsy();
    expect(query('[data-chat-wallpaper]')).toBeFalsy();
  });

  it('khối người dùng có tên thật cùng mic, loa và settings', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('app-user-panel')?.textContent).toContain('Minh Tài');
    expect(queryAll('app-user-panel button[aria-pressed]').length).toBe(2);
    // Nút cài đặt trước đây bị khoá vì UI Settings chưa dựng xong; giờ
    // SettingsModal đã có và đã gắn vào layout nên nó bấm được.
    const settings = query(
      'app-user-panel button.user-panel__control--settings',
    ) as HTMLButtonElement;
    expect(settings).toBeTruthy();
    expect(settings.disabled).toBe(false);
  });

  it('gắn SettingsModal vào layout để nút cài đặt có thứ để mở', async () => {
    await harness.navigateByUrl('/channels/@me');

    // Modal tự ẩn qua isOpen() nên thẻ luôn có mặt trong DOM. Trước đây nó
    // không được gắn ở đâu cả — bấm nút chỉ đổi tín hiệu, không gì hiện ra.
    expect(query('app-settings-modal')).toBeTruthy();
  });

  it('giữ light mode khi chuyển qua kênh và quay lại trang bạn bè', async () => {
    await harness.navigateByUrl('/channels/@me');
    const themeButton = query(
      'button[aria-label="Chuyển sang giao diện sáng"]',
    ) as HTMLButtonElement;

    themeButton.click();
    TestBed.tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('nexuscord-theme')).toBe('light');

    await harness.navigateByUrl('/channels/server-chua-tai/kenh-chua-tai');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await harness.navigateByUrl('/channels/@me');
    expect(query('button[aria-label="Chuyển sang giao diện tối"]')).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
