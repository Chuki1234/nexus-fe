import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import type { OwnProfile, ProfileGame, UpdateProfileRequest } from '../../../shared';
import { ProfileGamesService } from './profile-games.service';
import { ProfileStore } from './profile-store';

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

function game(kind: ProfileGame['kind'], title: string, tags: string[] = []): ProfileGame {
  return {
    id: `${kind}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    kind,
    title,
    cover: null,
    tags,
  };
}

function setup(games: ProfileGame[] = []) {
  const sent: UpdateProfileRequest[] = [];

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ProfilesApiService,
        useValue: {
          getOwn: () => Promise.resolve(BASE),
          update: (payload: UpdateProfileRequest) => {
            sent.push(payload);
            return Promise.resolve({ ...BASE, ...payload } as OwnProfile);
          },
        },
      },
    ],
  });

  const store = TestBed.inject(ProfileStore);
  store.set({ ...BASE, games });
  return { sent, store, service: TestBed.inject(ProfileGamesService) };
}

describe('ProfileGamesService', () => {
  it('gom trò chơi theo từng widget', () => {
    const { service } = setup([
      game('rotation', 'VALORANT'),
      game('like', 'Elden Ring'),
      game('like', 'Hades'),
    ]);

    expect(service.grouped().rotation.length).toBe(1);
    expect(service.grouped().like.length).toBe(2);
    expect(service.grouped().wishlist.length).toBe(0);
  });

  it('đếm đúng số chỗ còn trống của từng widget', () => {
    const { service } = setup([game('favorite', 'Hades'), game('rotation', 'VALORANT')]);

    expect(service.slotsLeft().favorite).toBe(0);
    expect(service.slotsLeft().rotation).toBe(4);
    expect(service.slotsLeft().like).toBe(20);
  });

  /** Payload phải đúng từng byte: DB có CHECK, sai một khoá là 400 mù. */
  it('thêm trò chơi gửi lên đúng hình dạng và giữ nguyên mục cũ', async () => {
    const { service, sent } = setup([game('like', 'Hades')]);

    const ok = await service.add('rotation', '  VALORANT  ', '');

    expect(ok).toBe(true);
    expect(sent.length).toBe(1);
    expect(sent[0].games).toEqual([
      { id: 'like:hades', kind: 'like', title: 'Hades', cover: null, tags: [] },
      { id: 'rotation:valorant', kind: 'rotation', title: 'VALORANT', cover: null, tags: [] },
    ]);
  });

  it('lưu xong thì ProfileStore mang dữ liệu mới', async () => {
    const { service, store } = setup();

    await service.add('like', 'Hades', '');

    expect(store.profile()?.games.map((g) => g.title)).toEqual(['Hades']);
  });

  it('tên rỗng bị chặn ngay ở client, không gọi API', async () => {
    const { service, sent } = setup();

    expect(await service.add('like', '   ', '')).toBe(false);
    expect(service.errorMessage()).toBe('Nhập tên trò chơi.');
    expect(sent.length).toBe(0);
  });

  it('ảnh bìa không phải https bị chặn', async () => {
    const { service, sent } = setup();

    expect(await service.add('like', 'Hades', 'http://x.com/a.png')).toBe(false);
    expect(service.errorMessage()).toContain('https://');
    expect(sent.length).toBe(0);
  });

  it('trùng tên trong cùng widget bị chặn', async () => {
    const { service, sent } = setup([game('like', 'Hades')]);

    expect(await service.add('like', 'hades', '')).toBe(false);
    expect(service.errorMessage()).toContain('đã có trong');
    expect(sent.length).toBe(0);
  });

  /** Cùng một game được phép nằm ở hai widget khác nhau. */
  it('cùng tên nhưng khác widget thì vẫn thêm được', async () => {
    const { service, sent } = setup([game('like', 'Hades')]);

    expect(await service.add('wishlist', 'Hades', '')).toBe(true);
    expect(sent[0].games?.length).toBe(2);
  });

  it('vượt hạn mức widget bị chặn kèm câu giải thích', async () => {
    const { service, sent } = setup([game('favorite', 'Hades')]);

    expect(await service.add('favorite', 'Elden Ring', '')).toBe(false);
    expect(service.errorMessage()).toContain('chỉ chứa được 1 trò chơi');
    expect(sent.length).toBe(0);
  });

  it('xoá trò chơi gửi lên danh sách đã bỏ đúng mục đó', async () => {
    const { service, sent } = setup([game('like', 'Hades'), game('like', 'Elden Ring')]);

    await service.remove('like:hades');

    expect(sent[0].games?.map((g) => g.title)).toEqual(['Elden Ring']);
  });

  it('thêm nhãn chỉ đụng đúng trò chơi đó', async () => {
    const { service, sent } = setup([
      game('rotation', 'VALORANT'),
      game('rotation', 'Hades'),
    ]);

    await service.addTag('rotation:valorant', ' FPS ');

    expect(sent[0].games?.[0].tags).toEqual(['FPS']);
    expect(sent[0].games?.[1].tags).toEqual([]);
  });

  it('nhãn trùng bị chặn', async () => {
    const { service, sent } = setup([game('rotation', 'VALORANT', ['FPS'])]);

    expect(await service.addTag('rotation:valorant', 'FPS')).toBe(false);
    expect(sent.length).toBe(0);
  });

  it('quá 4 nhãn bị chặn', async () => {
    const { service, sent } = setup([
      game('rotation', 'VALORANT', ['a', 'b', 'c', 'd']),
    ]);

    expect(await service.addTag('rotation:valorant', 'e')).toBe(false);
    expect(service.errorMessage()).toContain('tối đa 4 nhãn');
    expect(sent.length).toBe(0);
  });

  it('bỏ nhãn gửi lên danh sách nhãn đã trừ', async () => {
    const { service, sent } = setup([game('rotation', 'VALORANT', ['FPS', '684 giờ'])]);

    await service.removeTag('rotation:valorant', 'FPS');

    expect(sent[0].games?.[0].tags).toEqual(['684 giờ']);
  });

  /** Đóng khung cài đặt giữa chừng thì lần sau mở lại không thấy thứ gõ dở. */
  it('cancelAll dọn sạch mọi ô nhập dở', () => {
    const { service } = setup();

    service.startAdd('like');
    service.draftTitle.set('Hades');
    service.cancelAll();

    expect(service.pendingKind()).toBeNull();
    expect(service.draftTitle()).toBe('');
    expect(service.taggingId()).toBeNull();
  });

  it('startAdd vào widget đã đầy thì không mở ô nhập, báo lỗi luôn', () => {
    const { service } = setup([game('favorite', 'Hades')]);

    service.startAdd('favorite');

    expect(service.pendingKind()).toBeNull();
    expect(service.errorMessage()).toContain('chỉ chứa được 1 trò chơi');
  });
});
