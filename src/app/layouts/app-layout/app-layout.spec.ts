import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
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

describe('AppLayout', () => {
  let harness: RouterTestingHarness;

  const text = () => harness.routeNativeElement!.ownerDocument.body.textContent ?? '';
  const query = (selector: string) =>
    harness.routeNativeElement!.ownerDocument.body.querySelector(selector);
  const queryAll = (selector: string) =>
    Array.from(harness.routeNativeElement!.ownerDocument.body.querySelectorAll(selector));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        // Gắn dưới 'channels' đúng như app.routes thật. Mount ở gốc thì URL sẽ là
        // '/itss/do-an' trong khi mọi routerLink trỏ '/channels/itss/do-an', và
        // `routerLinkActive` không bao giờ khớp.
        //
        // Không cần provider animation: Angular Material 21 chạy bằng CSS
        // animation gốc, gói @angular/animations không còn là dependency.
        provideRouter([{ path: 'channels', children: dashboardRoutes }]),
        { provide: AuthService, useValue: new AuthServiceStub() },
        { provide: ProfileService, useValue: new ProfileServiceStub() },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('dựng đủ dải server và cột danh sách', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('app-server-rail')).toBeTruthy();
    expect(query('app-channel-sidebar')).toBeTruthy();
  });

  it('cột 2 hiện danh sách tin nhắn riêng khi ở khu @me', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(text()).toContain('Tin nhắn trực tiếp');
    expect(text()).toContain('ho_be');
    // Không phải danh sách kênh của server.
    expect(text()).not.toContain('Kênh thoại');
  });

  it('cột 2 đổi sang danh sách kênh khi mở một server', async () => {
    await harness.navigateByUrl('/channels/itss/do-an');

    expect(text()).toContain('ITSS Lab');
    expect(text()).toContain('đồ-án');
    expect(text()).toContain('Kênh thoại');
  });

  it('mở đúng cuộc trò chuyện theo id trên URL', async () => {
    await harness.navigateByUrl('/channels/@me/ho-be');

    expect(text()).toContain('ho_be');
    expect(text()).toContain('shut the fckup');
  });

  it('báo rõ khi id cuộc trò chuyện không tồn tại', async () => {
    await harness.navigateByUrl('/channels/@me/khong-co-that');

    expect(text()).toContain('Không tìm thấy cuộc trò chuyện này');
  });

  it('kênh thoại không có ô soạn tin', async () => {
    await harness.navigateByUrl('/channels/itss/standup');

    expect(text()).toContain('Chưa có ai trong kênh thoại này');
    expect(query('app-message-composer')).toBeFalsy();
  });

  it('kênh chữ có ô soạn tin', async () => {
    await harness.navigateByUrl('/channels/itss/do-an');

    expect(query('app-message-composer')).toBeTruthy();
  });

  it('vào thẳng server chưa chọn kênh thì mời chọn kênh', async () => {
    await harness.navigateByUrl('/channels/itss');

    expect(text()).toContain('Chọn một kênh để bắt đầu');
  });

  it('đánh dấu aria-current cho đúng một mục đang mở', async () => {
    await harness.navigateByUrl('/channels/itss/do-an');

    // `routerLinkActive` đặt `isActive` khi nhận NavigationEnd, tức SAU lượt
    // change detection mà harness chạy sẵn — cần thêm một lượt nữa thì binding
    // aria-current mới đọc được giá trị mới.
    harness.detectChanges();

    // Cột 2 chỉ được có một kênh mang aria-current; nếu không, trình đọc màn hình
    // sẽ đọc nhiều mục cùng là "trang hiện tại".
    const current = queryAll('app-channel-sidebar [aria-current="page"]');
    expect(current.length).toBe(1);
    expect(current[0].textContent).toContain('đồ-án');
  });

  it('hiện tên người dùng ở khối đáy cột 2', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('app-user-panel')?.textContent).toContain('Minh Tài');
  });
});
