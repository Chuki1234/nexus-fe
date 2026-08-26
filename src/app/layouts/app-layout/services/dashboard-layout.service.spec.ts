import { TestBed } from '@angular/core/testing';
import {
  DashboardLayoutService,
  LAYOUT_STORAGE_KEY_V1_LEGACY,
  LAYOUT_STORAGE_KEY_V2,
  MEMBER_DEFAULT_WIDTH,
  MEMBER_MAX_WIDTH,
  MEMBER_MIN_WIDTH,
  MOBILE_BREAKPOINT,
  NAV_DEFAULT_WIDTH,
  NAV_MAX_WIDTH,
  NAV_MIN_WIDTH,
} from './dashboard-layout.service';

describe('DashboardLayoutService', () => {
  let service: DashboardLayoutService;

  beforeEach(() => {
    localStorage.removeItem(LAYOUT_STORAGE_KEY_V2);
    localStorage.removeItem(LAYOUT_STORAGE_KEY_V1_LEGACY);
    TestBed.configureTestingModule({
      providers: [DashboardLayoutService],
    });
    service = TestBed.inject(DashboardLayoutService);
  });

  afterEach(() => {
    localStorage.removeItem(LAYOUT_STORAGE_KEY_V2);
    localStorage.removeItem(LAYOUT_STORAGE_KEY_V1_LEGACY);
  });

  it('khởi tạo kích thước mặc định cho Navigation và Member pane', () => {
    expect(service.navWidth()).toBe(NAV_DEFAULT_WIDTH);
    expect(service.memberWidth()).toBe(MEMBER_DEFAULT_WIDTH);
    expect(service.shouldForceCompact()).toBe(false);
  });

  it('clamp navigation width trong khoảng min và effective max hợp lệ', () => {
    service.setNavWidth(100);
    expect(service.navWidth()).toBe(NAV_MIN_WIDTH);

    service.setNavWidth(500);
    expect(service.navWidth()).toBe(NAV_MAX_WIDTH);

    service.setNavWidth(320);
    expect(service.navWidth()).toBe(320);
  });

  it('tính toán effectiveMaxNavWidth dựa trên containerWidth và MAIN_MIN_WIDTH 360px', () => {
    // 1. Container rộng 1280px -> 1280 - 72 - 360 - 32 = 816px > 380px -> max là 380px
    service.updateContainerWidth(1280);
    expect(service.effectiveMaxNavWidth()).toBe(NAV_MAX_WIDTH);

    // 2. Container tablet 768px -> 768 - 72 - 360 - 32 = 304px
    service.updateContainerWidth(768);
    expect(service.effectiveMaxNavWidth()).toBe(304);

    // 3. Nếu navWidth đang là 350px, khi container hẹp 768px (max 304px), navWidth tự clamp về 304px
    service.setNavWidth(350);
    expect(service.navWidth()).toBe(304);
  });

  it('chỉ trừ memberWidth vào effectiveMaxNavWidth khi containerWidth >= 1280px', () => {
    // Dưới 1280px, context-panel là fixed overlay nên không trừ vào flex space của container
    service.updateContainerWidth(1024);
    service.setIsMemberOpen(true);
    // 1024 - 72 - 360 - 0 - 32 = 560px > 380px -> max 380px
    expect(service.effectiveMaxNavWidth()).toBe(NAV_MAX_WIDTH);

    // Từ 1280px, context-panel là normal flow nên trừ memberWidth (280px)
    service.updateContainerWidth(1280);
    service.setIsMemberOpen(true);
    // 1280 - 72 - 360 - 280 - 32 = 536px > 380px -> max 380px
    expect(service.effectiveMaxNavWidth()).toBe(NAV_MAX_WIDTH);
  });

  describe('shouldForceCompact boundary values', () => {
    it('bật compact (true) khi containerWidth < 768px', () => {
      service.updateContainerWidth(375);
      expect(service.shouldForceCompact()).toBe(true);

      service.updateContainerWidth(600);
      expect(service.shouldForceCompact()).toBe(true);

      service.updateContainerWidth(767);
      expect(service.shouldForceCompact()).toBe(true);
    });

    it('tắt compact (false) cho tablet và laptop/desktop từ 768px trở lên', () => {
      service.updateContainerWidth(768);
      expect(service.shouldForceCompact()).toBe(false);

      service.updateContainerWidth(820);
      expect(service.shouldForceCompact()).toBe(false);

      service.updateContainerWidth(1024);
      expect(service.shouldForceCompact()).toBe(false);

      service.updateContainerWidth(1280);
      expect(service.shouldForceCompact()).toBe(false);
    });
  });

  it('khôi phục kích thước hợp lệ từ localStorage v2', () => {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY_V2,
      JSON.stringify({ navWidth: 340, memberWidth: 310 }),
    );

    const newService = new DashboardLayoutService();
    expect(newService.navWidth()).toBe(340);
    expect(newService.memberWidth()).toBe(310);
  });

  it('tự động migrate an toàn từ localStorage v1 legacy sang v2', () => {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY_V1_LEGACY,
      JSON.stringify({ navWidth: 330, memberWidth: 290 }),
    );

    const newService = new DashboardLayoutService();
    expect(newService.navWidth()).toBe(330);
    expect(newService.memberWidth()).toBe(290);
    // Legacy key đã được xóa
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY_V1_LEGACY)).toBeNull();
  });

  it('xử lý an toàn khi localStorage chứa JSON hỏng hoặc giá trị ngoài biên', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY_V2, 'invalid-json-{}');
    const newService = new DashboardLayoutService();
    expect(newService.navWidth()).toBe(NAV_DEFAULT_WIDTH);
    expect(newService.memberWidth()).toBe(MEMBER_DEFAULT_WIDTH);

    localStorage.setItem(
      LAYOUT_STORAGE_KEY_V2,
      JSON.stringify({ navWidth: 9999, memberWidth: 10 }),
    );
    const clampedService = new DashboardLayoutService();
    expect(clampedService.navWidth()).toBe(NAV_MAX_WIDTH);
    expect(clampedService.memberWidth()).toBe(MEMBER_MIN_WIDTH);
  });

  it('resetNavWidth và resetMemberWidth khôi phục về mặc định và lưu', () => {
    service.setNavWidth(350);
    service.setMemberWidth(320);
    expect(service.navWidth()).toBe(350);
    expect(service.memberWidth()).toBe(320);

    service.resetNavWidth();
    expect(service.navWidth()).toBe(NAV_DEFAULT_WIDTH);

    service.resetMemberWidth();
    expect(service.memberWidth()).toBe(MEMBER_DEFAULT_WIDTH);

    const saved = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY_V2) || '{}');
    expect(saved.navWidth).toBe(NAV_DEFAULT_WIDTH);
    expect(saved.memberWidth).toBe(MEMBER_DEFAULT_WIDTH);
  });
});
