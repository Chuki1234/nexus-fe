import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { describe, expect, it, vi } from 'vitest';
import { InlineTranslateLoader } from '../../../core/i18n/language.service';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/translations';
import { ProfileApiService } from '../../../core/profile/profile-api.service';
import { MockMember, selfAsMember } from '../../../pages/channels/mock/chat-mock';
import { ProfileCardService } from './profile-card.service';
import { ProfileModalComponent } from './profile-modal.component';

const MEMBER: MockMember = {
  id: 'u2',
  username: 'ducpham',
  displayName: 'Đức Phạm',
  color: '#7b3ff2',
  roleName: 'Điều hành viên',
  roleServer: 'Nexus Core',
  status: 'online',
};

/**
 * Dựng thật cửa sổ hồ sơ để bắt lỗi lúc chạy — thứ mà `ng build` không thấy.
 * Trước đây cửa sổ này hiện ra trống trơn (mất avatar, tên, nút) mà build vẫn xanh.
 */
function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      // Nhánh trống của bio/liên kết dùng TranslatePipe (EmptyFieldComponent) —
      // thiếu provider này thì pipe ném lỗi ngay khi template render.
      provideTranslateService({ lang: DEFAULT_LANGUAGE, fallbackLang: DEFAULT_LANGUAGE }),
      provideTranslateLoader(InlineTranslateLoader),
      // Không chạm mạng: cửa sổ tra hồ sơ thật theo username.
      {
        provide: ProfileApiService,
        useValue: { getByUsername: vi.fn().mockResolvedValue(null) },
      },
    ],
  });

  const fixture = TestBed.createComponent(ProfileModalComponent);
  const cards = TestBed.inject(ProfileCardService);
  return { fixture, cards };
}

describe('ProfileModalComponent', () => {
  it('hiện tên, username và nút hành động khi mở', async () => {
    const { fixture, cards } = setup();

    cards.openModal(MEMBER, document.createElement('button'));
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Đức Phạm');
    expect(text).toContain('ducpham');
    expect(text).toContain('Nhắn tin');
  });

  it('hiện vai trò kèm tên máy chủ, vì vai trò trần không nói lên điều gì', async () => {
    const { fixture, cards } = setup();

    cards.openModal(MEMBER, document.createElement('button'));
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vai trò tại Nexus Core');
    expect(text).toContain('Điều hành viên');
  });

  it('giấu vai trò khi không biết máy chủ nào — ví dụ mở từ tin nhắn riêng', async () => {
    const { fixture, cards } = setup();

    cards.openModal({ ...MEMBER, roleServer: null }, document.createElement('button'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent ?? '').not.toContain('Vai trò');
  });

  it('hiện tên khi mở từ avatar của chính mình ở thanh dưới đáy', async () => {
    const { fixture, cards } = setup();

    cards.openModal(selfAsMember('www', 'cyrus'), document.createElement('button'));
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('cyrus');
    expect(text).toContain('www');
  });

  it('không dựng gì khi lời mở là kiểu popover', async () => {
    const { fixture, cards } = setup();

    cards.toggle(MEMBER, document.createElement('button'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});
