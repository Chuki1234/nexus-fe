import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { TimeAgoService } from './time-ago.service';

describe('TimeAgoService', () => {
  let service: TimeAgoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TimeAgoService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(TimeAgoService);
  });

  it('trả về null nếu isoString null hoặc rỗng hoặc không hợp lệ', () => {
    expect(service.formatLastSeen(null)).toBeNull();
    expect(service.formatLastSeen(undefined)).toBeNull();
    expect(service.formatLastSeen('')).toBeNull();
    expect(service.formatLastSeen('invalid-date')).toBeNull();
  });

  it('dưới 60 giây -> "Hoạt động vừa xong"', () => {
    const now = 1756000000000;
    const iso = new Date(now - 30 * 1000).toISOString();
    expect(service.formatLastSeen(iso, now)).toBe('Hoạt động vừa xong');
  });

  it('1 đến 59 phút -> "Hoạt động {n} phút trước"', () => {
    const now = 1756000000000;
    const iso5m = new Date(now - 5 * 60 * 1000).toISOString();
    expect(service.formatLastSeen(iso5m, now)).toBe('Hoạt động 5 phút trước');

    const iso45m = new Date(now - 45 * 60 * 1000).toISOString();
    expect(service.formatLastSeen(iso45m, now)).toBe('Hoạt động 45 phút trước');
  });

  it('1 đến 23 giờ -> "Hoạt động {n} giờ trước"', () => {
    const now = 1756000000000;
    const iso2h = new Date(now - 2 * 3600 * 1000).toISOString();
    expect(service.formatLastSeen(iso2h, now)).toBe('Hoạt động 2 giờ trước');
  });

  it('1 ngày -> "Hoạt động hôm qua"', () => {
    const now = 1756000000000;
    const iso1d = new Date(now - 26 * 3600 * 1000).toISOString();
    expect(service.formatLastSeen(iso1d, now)).toBe('Hoạt động hôm qua');
  });

  it('2 đến 6 ngày -> "Hoạt động {n} ngày trước"', () => {
    const now = 1756000000000;
    const iso3d = new Date(now - 3 * 24 * 3600 * 1000).toISOString();
    expect(service.formatLastSeen(iso3d, now)).toBe('Hoạt động 3 ngày trước');
  });

  it('7 ngày trở lên -> "Hoạt động ngày dd/MM/yyyy"', () => {
    const now = 1756000000000;
    const date = new Date(now - 10 * 24 * 3600 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    expect(service.formatLastSeen(date.toISOString(), now)).toBe(
      `Hoạt động ngày ${day}/${month}/${year}`,
    );
  });
});
