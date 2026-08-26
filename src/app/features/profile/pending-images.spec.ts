import { TestBed } from '@angular/core/testing';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import type { OwnProfile } from '../../../shared';
import { ProfilePendingImages } from './pending-images';
import { ProfileStore } from './profile-store';

const PROFILE: OwnProfile = {
  id: 'u1',
  username: 'ducpham',
  displayName: 'Đức Phạm',
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
  birthdate: '2001-11-03',
};

function fakeFile(name = 'a.png'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

function setup(api: Partial<ProfilesApiService> = {}) {
  TestBed.configureTestingModule({
    providers: [
      { provide: ProfilesApiService, useValue: { getOwn: () => Promise.resolve(PROFILE), ...api } },
    ],
  });
  return {
    staged: TestBed.inject(ProfilePendingImages),
    store: TestBed.inject(ProfileStore),
  };
}

describe('ProfilePendingImages', () => {
  // jsdom không có sẵn hai hàm này; chỉ cần chúng tồn tại để xem trước chạy được.
  beforeEach(() => {
    URL.createObjectURL ??= () => 'blob:test';
    URL.revokeObjectURL ??= () => undefined;
  });

  it('chọn ảnh xong là có thay đổi chờ, chưa gọi máy chủ', () => {
    let uploads = 0;
    const { staged } = setup({
      uploadImage: () => {
        uploads += 1;
        return Promise.resolve(PROFILE);
      },
    });

    expect(staged.hasPending()).toBe(false);

    staged.stage('avatar', fakeFile());

    expect(staged.hasPending()).toBe(true);
    expect(staged.previewFor('avatar')).toBeTruthy();
    expect(uploads).toBe(0);
  });

  it('gỡ ảnh cũng chỉ xếp hàng chờ, và xem trước là rỗng', () => {
    const { staged } = setup();

    staged.stageRemoval('banner');

    expect(staged.hasPending()).toBe(true);
    // `null` = "sẽ gỡ", khác hẳn `undefined` = "không đụng tới".
    expect(staged.previewFor('banner')).toBeNull();
    expect(staged.previewFor('avatar')).toBeUndefined();
  });

  it('discard bỏ sạch hàng chờ', () => {
    const { staged } = setup();

    staged.stage('avatar', fakeFile());
    staged.stageRemoval('banner');
    staged.discard();

    expect(staged.hasPending()).toBe(false);
    expect(staged.previewFor('avatar')).toBeUndefined();
  });

  it('commit gửi ảnh lên, ghi hồ sơ mới vào store rồi dọn hàng chờ', async () => {
    const uploaded: string[] = [];
    const saved: OwnProfile = { ...PROFILE, avatarUrl: 'https://x/a.webp' };
    const { staged, store } = setup({
      uploadImage: (kind) => {
        uploaded.push(kind);
        return Promise.resolve(saved);
      },
      removeImage: (kind) => {
        uploaded.push(`remove:${kind}`);
        return Promise.resolve(saved);
      },
    });

    staged.stage('avatar', fakeFile());
    staged.stageRemoval('banner');
    await staged.commit();

    expect(uploaded).toEqual(['avatar', 'remove:banner']);
    expect(store.profile()?.avatarUrl).toBe('https://x/a.webp');
    expect(staged.hasPending()).toBe(false);
  });

  it('commit hỏng thì giữ nguyên ảnh đã chọn để bấm Lưu lại được', async () => {
    const { staged } = setup({
      uploadImage: () => Promise.reject(new Error('mạng hỏng')),
    });

    staged.stage('avatar', fakeFile());
    await expect(staged.commit()).rejects.toBeTruthy();

    expect(staged.hasPending()).toBe(true);
    expect(staged.errorMessage()).toBeTruthy();
    expect(staged.saving()).toBe(false);
  });
});
