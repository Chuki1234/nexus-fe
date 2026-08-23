import { TestBed } from '@angular/core/testing';
import {
  DashboardLayoutService,
  LAYOUT_STORAGE_KEY_V1_LEGACY,
  LAYOUT_STORAGE_KEY_V2,
  MEMBER_DEFAULT_WIDTH,
  MEMBER_MAX_WIDTH,
  MEMBER_MIN_WIDTH,
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

  it('tính toán effectiveMaxNavWidth dựa trên containerWidth và trừ đủ không gian main 560px', () => {
    // Container rộng 1280px, server rail 72px, gap 32px, main min 560px -> 1280 - 72 - 560 - 32 = 616px > 380px -> max là 380px
    service.updateContainerWidth(1280);
    expect(service.effectiveMaxNavWidth()).toBe(NAV_MAX_WIDTH);

    // Container hẹp 920px -> 920 - 72 - 560 - 32 = 256px -> effectiveMax là 256px
    service.updateContainerWidth(920);
    expect(service.effectiveMaxNavWidth()).toBe(256);

    // Nếu navWidth đang là 300px, khi container hẹp 920px (max 256px), navWidth tự clamp về 256px
    service.setNavWidth(300);
    expect(service.navWidth()).toBe(256);
  });

  it('bật shouldForceCompact khi container quá nhỏ không đủ chứa min nav 240px + main 560px', () => {
    // Container hẹp 800px -> 800 - 72 - 560 - 32 = 136px < 240px
    service.updateContainerWidth(800);
    expect(service.shouldForceCompact()).toBe(true);

    // Container tăng lại 1200px -> shouldForceCompact = false
    service.updateContainerWidth(1200);
    expect(service.shouldForceCompact()).toBe(false);
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
