import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
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
  const mount = async (serverId: string | null) => {
    await TestBed.configureTestingModule({
      imports: [ChannelSidebar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthStub() },
        { provide: ProfileService, useValue: new ProfileStub() },
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
  });

  it('có serverId thì đổi sang danh sách kênh và hiện tên server', async () => {
    const fixture = await mount('itss');

    expect(fixture.nativeElement.querySelector('app-channel-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-conversation-list')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('ITSS Lab');
  });

  // Hai lần mount trong cùng một `it` không được: TestBed đã cấu hình rồi thì
  // không cấu hình lại được nữa. Tách thành hai test riêng.
  it('có khối người dùng ở đáy khi đang ở khu tin nhắn riêng', async () => {
    const fixture = await mount(null);

    expect(fixture.nativeElement.querySelector('app-user-panel')).toBeTruthy();
  });

  it('có khối người dùng ở đáy khi đang mở server', async () => {
    const fixture = await mount('itss');

    expect(fixture.nativeElement.querySelector('app-user-panel')).toBeTruthy();
  });
});
