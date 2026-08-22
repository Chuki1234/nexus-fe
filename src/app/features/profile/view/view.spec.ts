import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProfilesApiService } from '../../../core/api/profiles-api.service';
import type { PublicProfile } from '../../../../shared';
import { ProfileViewPage } from './view';

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

function setup(api: Partial<ProfilesApiService>) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ProfilesApiService, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ username: 'ducpham' })) },
      },
    ],
  });
  return TestBed.createComponent(ProfileViewPage);
}

describe('ProfileViewPage', () => {
  it('tải hồ sơ theo username trên URL rồi hiện tên', async () => {
    const fixture = setup({ getByUsername: () => Promise.resolve(PERSON) });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đức Phạm');
  });

  it('không tìm thấy người dùng thì hiện lỗi thay vì trang trống', async () => {
    const fixture = setup({
      getByUsername: () => Promise.reject({ status: 404, error: { message: 'Không tìm thấy.' } }),
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).toContain('Không mở được hồ sơ');
  });
});
