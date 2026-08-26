import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { UserPanel } from './user-panel';
import { ProfileStore } from '../../../../features/profile/profile-store';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import { VoiceRoomService } from '../../../../features/voice/services/voice-room.service';

import { MediaDeviceService } from '../../../../features/voice/services/media-device.service';

class AuthStub {
  user = () => ({ email: 'mon@nexus.test' });
  signOut = () => Promise.resolve();
  deleteAccount = () => Promise.resolve();
}

describe('UserPanel', () => {
  let profile: { current: () => unknown; reset: () => void };
  let mockMediaDevice: {
    isTestingMic: ReturnType<typeof signal<boolean>>;
    startMicrophoneTest: ReturnType<typeof vi.fn>;
    stopMicrophoneTest: ReturnType<typeof vi.fn>;
    audioLevel: ReturnType<typeof signal<number>>;
  };

  const mount = async () => {
    const isTesting = signal(false);
    mockMediaDevice = {
      isTestingMic: isTesting,
      startMicrophoneTest: vi.fn().mockImplementation(() => {
        isTesting.set(true);
        return Promise.resolve();
      }),
      stopMicrophoneTest: vi.fn().mockImplementation(() => {
        isTesting.set(false);
      }),
      audioLevel: signal(0),
    };

    await TestBed.configureTestingModule({
      imports: [UserPanel],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthStub() },
        { provide: ProfileService, useValue: profile },
        { provide: ProfilesApiService, useValue: { getOwn: () => Promise.resolve(null) } },
        { provide: MediaDeviceService, useValue: mockMediaDevice },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(UserPanel);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    profile = {
      current: () => ({ id: 'u1', username: 'minhtai', displayName: 'Minh Tài' }),
      reset: () => undefined,
    };
  });

  it('hiện tên hiển thị của người đang đăng nhập', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Minh Tài');
    expect(
      fixture.nativeElement.querySelector('.user-panel__identity')?.classList.contains('nexus-interactive-row'),
    ).toBe(true);
  });

  it('giữ trạng thái popover trên khối danh tính khi mở card', async () => {
    const fixture = await mount();
    expect(fixture.componentInstance['popoverOpen']()).toBe(false);

    fixture.componentInstance['openCard']();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance['popoverOpen']()).toBe(true);
  });

  it('chưa có tên hiển thị thì rơi về tên đăng nhập', async () => {
    profile.current = () => ({ id: 'u1', username: 'minhtai', displayName: null });
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('minhtai');
  });

  it('chưa tải được hồ sơ vẫn không để trống chỗ tên', async () => {
    profile.current = () => null;
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Bạn');
  });

  it('nút mic và loa đổi trạng thái tại chỗ', async () => {
    const fixture = await mount();
    const mic = fixture.nativeElement.querySelectorAll('[aria-pressed]')[0] as HTMLButtonElement;

    expect(mic.getAttribute('aria-pressed')).toBe('false');
    expect(mic.classList.contains('nexus-audio-toggle')).toBe(true);
    mic.click();
    fixture.detectChanges();
    expect(mic.getAttribute('aria-pressed')).toBe('true');
  });

  it('tách danh tính và control group để tên dài không tạo overflow ngang', async () => {
    profile.current = () => ({
      id: 'u1',
      username: 'minhtai',
      displayName: 'Nguyễn Minh Tài có tên hiển thị rất dài',
    });
    const fixture = await mount();
    const controls = Array.from(
      fixture.nativeElement.querySelectorAll('button.nexus-icon-control'),
    ) as HTMLButtonElement[];
    const identity = fixture.nativeElement.querySelector(
      '.user-panel__identity',
    ) as HTMLElement;
    const controlGroup = fixture.nativeElement.querySelector(
      '.user-panel__controls[role="group"]',
    ) as HTMLDivElement;

    expect(fixture.nativeElement.classList.contains('overflow-hidden')).toBe(true);
    expect(controls).toHaveLength(3);
    expect(controls.every((control) => control.classList.contains('user-panel__control'))).toBe(
      true,
    );
    expect(identity).toBeTruthy();
    expect(identity.textContent).toContain('Nguyễn Minh Tài');
    expect(controlGroup.getAttribute('aria-label')).toBe('Điều khiển âm thanh và ứng dụng');
  });

  it('để nút cài đặt có thể bấm tương tác như các control khác', async () => {
    const fixture = await mount();
    const settings = fixture.nativeElement.querySelector(
      'button.user-panel__control--settings',
    ) as HTMLButtonElement;

    expect(settings).toBeTruthy();
    expect(settings.disabled).toBe(false);
    expect(settings.textContent).toContain('settings');
    expect(settings.classList.contains('nexus-icon-control')).toBe(true);
  });

  it('hiển thị banner đã kết nối giọng nói kèm nút test mic và ngắt kết nối khi đang trong phòng voice', async () => {
    const fixture = await mount();
    const voiceRoom = TestBed.inject(VoiceRoomService);
    voiceRoom.connectionStatus.set('connected');
    voiceRoom.currentChannelName.set('Phòng họp');
    fixture.detectChanges();

    const voiceStatus = fixture.nativeElement.querySelector('.user-panel__voice-status');
    expect(voiceStatus).toBeTruthy();
    expect(voiceStatus.textContent).toContain('Đã Kết Nối Giọng Nói');
    expect(voiceStatus.textContent).toContain('#Phòng họp');

    const testMicBtn = voiceStatus.querySelectorAll('button')[0];
    expect(testMicBtn).toBeTruthy();

    const disconnectBtn = voiceStatus.querySelectorAll('button')[1];
    expect(disconnectBtn).toBeTruthy();
  });

  it('bật và tắt test mic khi bấm nút Test Mic', async () => {
    const fixture = await mount();
    const voiceRoom = TestBed.inject(VoiceRoomService);
    voiceRoom.connectionStatus.set('connected');
    voiceRoom.currentChannelName.set('Phòng họp');
    fixture.detectChanges();

    const testMicBtn = fixture.nativeElement.querySelector(
      '.user-panel__voice-status button',
    ) as HTMLButtonElement;
    expect(testMicBtn).toBeTruthy();

    testMicBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['isTestingMic']()).toBe(true);

    testMicBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['isTestingMic']()).toBe(false);
  });
});
