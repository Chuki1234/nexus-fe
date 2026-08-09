import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ShellData } from '../../../../core/api/shell-data';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ChannelSidebar } from './channel-sidebar';

class AuthStub {
  signOut = () => Promise.resolve();
}
class ProfileStub {
  current = () => null;
  reset = () => undefined;
}

describe('ChannelSidebar', () => {
  const mount = async (serverId: string | null, shell: ShellData = new ShellData()) => {
    await TestBed.configureTestingModule({
      imports: [ChannelSidebar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthStub() },
        { provide: ProfileService, useValue: new ProfileStub() },
        { provide: ShellData, useValue: shell },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ChannelSidebar);
    (fixture.componentRef as ComponentRef<ChannelSidebar>).setInput('serverId', serverId);
    fixture.detectChanges();
    return fixture;
  };

  it('không có serverId thì hiện danh sách hộp thoại và ô tìm kiếm', async () => {
    const fixture = await mount(null);

    expect(fixture.nativeElement.querySelector('app-conversation-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-channel-list')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('app-search-field')).toBeTruthy();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.placeholder).toBe('Tìm người hoặc cuộc trò chuyện');
    expect(fixture.nativeElement.querySelector('.channel-sidebar__header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('nav')?.classList.contains('nexus-scrollbar')).toBe(
      true,
    );
    expect(fixture.nativeElement.classList.contains('min-w-0')).toBe(true);
    expect(fixture.nativeElement.classList.contains('flex-1')).toBe(true);
  });

  it('lọc người và DM ngay trong sidebar, không đẩy kết quả sang workspace', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount(null, shell);
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;

    input.value = 'binh';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const results = fixture.nativeElement.querySelectorAll('[data-conversation-id]');
    expect(results).toHaveLength(1);
    expect(results[0].getAttribute('data-conversation-id')).toBe('binh');
    expect(fixture.nativeElement.textContent).toContain('Kết quả · 1');
    expect(fixture.nativeElement.querySelector('a[href="/channels/@me"]')).toBeTruthy();
  });

  it('có serverId chưa tồn tại thì vẫn giữ khung danh sách kênh an toàn', async () => {
    const fixture = await mount('server-chua-tai');

    expect(fixture.nativeElement.querySelector('app-channel-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-conversation-list')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Máy chủ');
    expect(fixture.nativeElement.textContent).toContain('chưa có kênh nào');
  });

  // Hai lần mount trong cùng một `it` không được: TestBed đã cấu hình rồi thì
  // không cấu hình lại được nữa. Tách thành hai test riêng.
  it('có khối người dùng ở đáy khi đang ở khu tin nhắn riêng', async () => {
    const fixture = await mount(null);

    expect(fixture.nativeElement.querySelector('app-user-panel')).toBeTruthy();
  });

  it('có khối người dùng ở đáy khi đang mở server', async () => {
    const fixture = await mount('server-chua-tai');

    expect(fixture.nativeElement.querySelector('app-user-panel')).toBeTruthy();
  });
});
