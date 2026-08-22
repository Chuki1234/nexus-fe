import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { PublicProfile } from '../../../../../shared';
import { ProfileModal, type ProfileModalData } from './profile-modal';

const PERSON: PublicProfile = {
  id: 'u1',
  username: 'ducpham',
  displayName: 'Đức Phạm',
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: null,
  bio: null,
  location: null,
  links: [],
  accentColor: null,
  createdAt: '2026-03-15T00:00:00.000Z',
  isSelf: false,
};

function setup(data: ProfileModalData, api: Partial<ProfilesApiService> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: () => {} } },
      { provide: ProfilesApiService, useValue: api },
    ],
  });
  return TestBed.createComponent(ProfileModal);
}

describe('ProfileModal', () => {
  it('dùng ngay hồ sơ được truyền vào, không gọi API lần hai', async () => {
    let called = false;
    const fixture = setup(
      { username: 'ducpham', profile: PERSON },
      {
        getByUsername: () => {
          called = true;
          return Promise.resolve(PERSON);
        },
      },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(called).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đức Phạm');
  });

  it('chỉ có username thì tự tải hồ sơ về', async () => {
    const fixture = setup(
      { username: 'ducpham' },
      { getByUsername: () => Promise.resolve(PERSON) },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đức Phạm');
  });

  it('luôn có nút đóng để thoát được bằng chuột', async () => {
    const fixture = setup({ username: 'ducpham', profile: PERSON });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Đóng hồ sơ');
  });
});
