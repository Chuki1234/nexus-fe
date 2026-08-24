import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import type { ProfileSummary } from '../../../../../shared';
import { ProfileSearch } from './profile-search';

const FOUND: ProfileSummary[] = [
  { id: 'u1', username: 'maitran', displayName: 'Mai Trần', avatarUrl: null },
  { id: 'u2', username: 'linhvo', displayName: null, avatarUrl: null },
];

function setup(search: (q: string) => Promise<ProfileSummary[]>) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ProfilesApiService, useValue: { search } },
    ],
  });
  return TestBed.createComponent(ProfileSearch);
}

/** Gõ vào ô tìm rồi chờ qua khoảng debounce 250ms. */
async function type(fixture: ComponentFixture<ProfileSearch>, value: string): Promise<void> {
  const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 320));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ProfileSearch', () => {
  it('gõ đủ dài thì hiện kết quả kèm username', async () => {
    const fixture = setup(() => Promise.resolve(FOUND));
    await type(fixture, 'mai');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Mai Trần');
    expect(text).toContain('maitran');
  });

  it('không có tên hiển thị thì rơi về username', async () => {
    const fixture = setup(() => Promise.resolve(FOUND));
    await type(fixture, 'linh');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('linhvo');
  });

  it('một ký tự thì chưa gọi API — mọi người đều khớp, kết quả vô nghĩa', async () => {
    let calls = 0;
    const fixture = setup(() => {
      calls += 1;
      return Promise.resolve(FOUND);
    });
    await type(fixture, 'm');

    expect(calls).toBe(0);
  });

  it('không ai khớp thì nói rõ, không để trống trơn', async () => {
    const fixture = setup(() => Promise.resolve([]));
    await type(fixture, 'khongaiten');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không tìm thấy ai khớp');
  });
});
