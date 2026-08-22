import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsModal } from './settings-modal';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/profile/profile.service';
import { UserSettingsService } from './services/user-settings.service';

class AuthStub {
  signOut = () => Promise.resolve();
}

describe('SettingsModal', () => {
  let settingsService: UserSettingsService;

  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsModal],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthStub() },
        {
          provide: ProfileService,
          useValue: {
            current: () => ({
              id: 'u1',
              username: 'nexus_user',
              displayName: 'Nexus User',
              email: 'test@nexus.app',
            }),
            reset: () => undefined,
          },
        },
      ],
    }).compileComponents();

    settingsService = TestBed.inject(UserSettingsService);
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.detectChanges();
    return fixture;
  };

  it('không hiển thị khi isOpen = false', async () => {
    const fixture = await mount();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('hiển thị đầy đủ sidebar và tab nội dung khi isOpen = true', async () => {
    const fixture = await mount();
    settingsService.open('account');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tài Khoản');
    expect(fixture.nativeElement.textContent).toContain('Sửa Hồ Sơ');
    const input = fixture.nativeElement.querySelector('input[placeholder*="Tìm kiếm"]');
    expect(input).toBeTruthy();
  });

  it('chuyển tab khi bấm vào mục điều hướng', async () => {
    const fixture = await mount();
    settingsService.open('account');
    fixture.detectChanges();

    settingsService.setTab('voice-video');
    fixture.detectChanges();

    expect(settingsService.currentTab()).toBe('voice-video');
    expect(fixture.nativeElement.textContent).toContain('Giọng nói');
  });

  it('đóng modal khi bấm phím Escape', async () => {
    const fixture = await mount();
    settingsService.open('account');
    fixture.detectChanges();

    expect(settingsService.isOpen()).toBe(true);

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(settingsService.isOpen()).toBe(false);
  });
});
