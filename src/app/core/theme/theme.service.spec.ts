import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    TestBed.tick();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('mặc định dùng dark và đồng bộ lên html', () => {
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle sang light và lưu preference trong browser', () => {
    service.toggle();
    TestBed.tick();

    expect(service.mode()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('nexuscord-theme')).toBe('light');
  });

  it('đọc preference hợp lệ đã lưu khi service khởi tạo', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('nexuscord-theme', 'light');
    TestBed.configureTestingModule({});

    service = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(service.mode()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
