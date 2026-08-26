import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import { ConversationsApiService } from '../../core/api/conversations-api.service';
import type { PublicProfile } from '../../../shared';
import { ProfileTrigger } from './profile-trigger';
import { Avatar } from '../../shared/ui/avatar/avatar';

const PROFILE: PublicProfile = {
  id: 'u-other',
  username: 'lukenguyen',
  displayName: 'Luke Nguyen',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: 'Đang bận',
  bio: null,
  location: null,
  links: [],
  games: [],
  mutualFriends: [],
  mutualServers: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: false,
};

@Component({
  imports: [ProfileTrigger],
  template: `<span [appProfileTrigger]="'lukenguyen'">avatar</span>`,
})
class Host {}

/** Đúng cách kênh máy chủ dùng: directive gắn thẳng lên `<app-avatar>`. */
@Component({
  imports: [ProfileTrigger, Avatar],
  template: `
    <app-avatar [appProfileTrigger]="'lukenguyen'" name="Luke Nguyen" size="md" />
  `,
})
class AvatarHost {}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      {
        provide: ProfilesApiService,
        useValue: { getByUsername: () => Promise.resolve(PROFILE) },
      },
      { provide: ConversationsApiService, useValue: { getOrCreateDm: () => Promise.resolve({ id: 'c1' }) } },
    ],
  });

  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const overlay = TestBed.inject(OverlayContainer).getContainerElement();
  const trigger = (fixture.nativeElement as HTMLElement).querySelector('span')!;
  return { fixture, overlay, trigger };
}

/** Chờ hết chuỗi promise của `ensure()` rồi mới đọc DOM. */
async function settle(fixture: { detectChanges: () => void }) {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
}

describe('ProfileTrigger', () => {
  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  /**
   * Cú bấm ĐẦU TIÊN phải mở được thẻ. Bản trước đọc thẳng signal của
   * `profileFor()` — lúc đó request còn đang bay nên luôn ra `null` và hàm im
   * lặng thoát, phải bấm lần hai mới ra, trông y như nút hỏng.
   */
  it('bấm lần đầu vào một người chưa tra bao giờ vẫn mở được thẻ hồ sơ', async () => {
    const { fixture, overlay, trigger } = setup();

    expect(overlay.querySelector('app-profile-popover')).toBeNull();

    trigger.click();
    await settle(fixture);

    expect(overlay.querySelector('app-profile-popover')).toBeTruthy();
    expect(overlay.textContent).toContain('Luke Nguyen');
  });

  it('bấm lần nữa thì đóng thẻ đang mở', async () => {
    const { fixture, overlay, trigger } = setup();

    trigger.click();
    await settle(fixture);
    expect(overlay.querySelector('app-profile-popover')).toBeTruthy();

    trigger.click();
    await settle(fixture);
    expect(overlay.querySelector('app-profile-popover')).toBeNull();
  });

  /** Bấm dồn trong lúc chờ mạng không được xếp chồng nhiều thẻ lên nhau. */
  it('bấm dồn nhiều lần chỉ mở đúng một thẻ', async () => {
    const { fixture, overlay, trigger } = setup();

    trigger.click();
    trigger.click();
    trigger.click();
    await settle(fixture);

    expect(overlay.querySelectorAll('app-profile-popover').length).toBe(1);
  });

  it('phím Enter cũng mở được thẻ', async () => {
    const { fixture, overlay, trigger } = setup();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(fixture);

    expect(overlay.querySelector('app-profile-popover')).toBeTruthy();
  });

  /**
   * Kênh máy chủ gắn directive lên chính `<app-avatar>` (một component), không
   * phải thẻ thường — và bấm thì trúng `<img>`/`<span>` BÊN TRONG nó. Kiểm cả
   * đường này để không lặp lại chuyện avatar trong chat bấm không ra gì.
   */
  it('gắn trên <app-avatar>: bấm vào phần tử con bên trong vẫn mở được thẻ', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ProfilesApiService,
          useValue: { getByUsername: () => Promise.resolve(PROFILE) },
        },
        {
          provide: ConversationsApiService,
          useValue: { getOrCreateDm: () => Promise.resolve({ id: 'c1' }) },
        },
      ],
    });

    const fixture = TestBed.createComponent(AvatarHost);
    fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();

    const root = fixture.nativeElement as HTMLElement;
    const host = root.querySelector('app-avatar')!;
    expect(host.getAttribute('role')).toBe('button');

    // Bấm đúng phần tử con — chữ cái dự phòng — chứ không bấm thẳng host.
    const inner = host.querySelector('span') ?? host;
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);

    expect(overlay.querySelector('app-profile-popover')).toBeTruthy();
  });
});
