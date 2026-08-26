import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { OwnProfile, ProfileGame } from '../../../../../shared';
import { ProfileStore } from '../../profile-store';
import { AddWidgetDialog } from './add-widget-dialog';

const BASE: OwnProfile = {
  id: 'u1',
  username: 'duoc',
  displayName: 'Dược',
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
  birthdate: '2005-07-21',
};

function gamesOfKind(kind: ProfileGame['kind'], count: number): ProfileGame[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${kind}:g${i}`,
    kind,
    title: `Game ${i}`,
    cover: null,
    tags: [],
  }));
}

function setup(games: ProfileGame[] = []) {
  const closed: unknown[] = [];

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ProfilesApiService, useValue: { getOwn: () => Promise.resolve(BASE) } },
      { provide: MatDialogRef, useValue: { close: (v: unknown) => closed.push(v) } },
    ],
  });

  TestBed.inject(ProfileStore).set({ ...BASE, games });

  const fixture = TestBed.createComponent(AddWidgetDialog);
  fixture.detectChanges();
  return { fixture, closed, root: fixture.nativeElement as HTMLElement };
}

function buttonWith(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
}

describe('AddWidgetDialog', () => {
  it('mở ra ở nhóm "Sở thích" với đủ ba loại widget', () => {
    const { root } = setup();

    expect(root.textContent).toContain('Thêm Widget Hồ Sơ');
    expect(root.textContent).toContain('Trò Chơi Yêu Thích');
    expect(root.textContent).toContain('Trò Chơi Tôi Thích');
    expect(root.textContent).toContain('Muốn Chơi');
    // "Trò Chơi Luân Phiên" thuộc nhóm còn lại, chưa hiện.
    expect(root.textContent).not.toContain('Trò Chơi Luân Phiên');
  });

  it('đổi sang nhóm "Thống kê trò chơi" thì hiện widget luân phiên', () => {
    const { fixture, root } = setup();

    buttonWith(root, 'Thống kê trò chơi')?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Trò Chơi Luân Phiên');
    expect(root.textContent).not.toContain('Trò Chơi Yêu Thích');
  });

  /** Hộp thoại chỉ trả lời "thêm vào widget nào", việc nhập tên là bước riêng. */
  it('bấm một loại widget thì đóng và trả về đúng kind', () => {
    const { root, closed } = setup();

    buttonWith(root, 'Muốn Chơi')?.click();

    expect(closed).toEqual(['wishlist']);
  });

  /**
   * Widget đầy phải nói ra và khoá nút. Để bấm được rồi mới báo lỗi thì người
   * dùng phải gõ xong tên game mới biết là không thêm được.
   */
  it('widget đã đầy thì hiện "Đã đầy" và không bấm được', () => {
    const { root, closed } = setup(gamesOfKind('favorite', 1));

    const favorite = buttonWith(root, 'Trò Chơi Yêu Thích');
    expect(favorite?.disabled).toBe(true);
    expect(root.textContent).toContain('Đã đầy');

    favorite?.click();
    expect(closed).toEqual([]);
  });

  it('widget còn chỗ thì hiện số chỗ trống', () => {
    const { root } = setup(gamesOfKind('like', 18));

    expect(root.textContent).toContain('còn 2');
  });

  it('nút đóng trả về undefined để nơi gọi biết là huỷ', () => {
    const { root, closed } = setup();

    (root.querySelector('[aria-label="Đóng hộp thoại"]') as HTMLButtonElement).click();

    expect(closed).toEqual([undefined]);
  });
});
