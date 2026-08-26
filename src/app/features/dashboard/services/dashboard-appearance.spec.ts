import { TestBed } from '@angular/core/testing';
import { DashboardAppearance } from './dashboard-appearance';

describe('DashboardAppearance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const createService = () => {
    TestBed.configureTestingModule({});
    return TestBed.inject(DashboardAppearance);
  };

  it('mặc định dùng Hybrid khi tài khoản chưa chọn không khí', () => {
    const service = createService();

    expect(service.atmosphere()).toBe('hybrid');
    expect(service.options).toHaveLength(6);
  });

  it('lưu lựa chọn hợp lệ để dùng lại sau khi tải trang', () => {
    const service = createService();

    service.setAtmosphere('lagoon');

    expect(service.atmosphere()).toBe('lagoon');
    expect(localStorage.getItem('nexuscord-dashboard-atmosphere')).toBe('lagoon');
  });

  it('đọc lại lựa chọn đã lưu khi service khởi tạo', () => {
    localStorage.setItem('nexuscord-dashboard-atmosphere', 'lilac');

    const service = createService();

    expect(service.atmosphere()).toBe('lilac');
  });

  it('fallback về Hybrid khi storage chứa id không thuộc allow-list', () => {
    localStorage.setItem('nexuscord-dashboard-atmosphere', 'rainbow-tu-do');

    const service = createService();

    expect(service.atmosphere()).toBe('hybrid');
  });
});
