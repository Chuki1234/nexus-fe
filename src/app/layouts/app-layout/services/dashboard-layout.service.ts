import { computed, Injectable, signal } from '@angular/core';

export const LAYOUT_STORAGE_KEY_V2 = 'nexuscord:dashboard-layout:v2';
export const LAYOUT_STORAGE_KEY_V1_LEGACY = 'nexus_dashboard_layout_v1';

export const SERVER_RAIL_WIDTH = 72;
export const NAV_DEFAULT_WIDTH = 280;
export const NAV_MIN_WIDTH = 240;
export const NAV_MAX_WIDTH = 380;
export const MAIN_MIN_WIDTH = 360;

export const MEMBER_DEFAULT_WIDTH = 280;
export const MEMBER_MIN_WIDTH = 240;
export const MEMBER_MAX_WIDTH = 360;

export const LAYOUT_GAP_AND_PADDING = 32;
export const MOBILE_BREAKPOINT = 768;
export const MOBILE_BREAKPOINT_QUERY = '(max-width: 767.98px)';

export interface DashboardLayoutPreferences {
  navWidth: number;
  memberWidth: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardLayoutService {
  readonly navWidth = signal<number>(NAV_DEFAULT_WIDTH);
  readonly memberWidth = signal<number>(MEMBER_DEFAULT_WIDTH);
  readonly isDraggingNav = signal<boolean>(false);
  readonly isDraggingMember = signal<boolean>(false);

  readonly containerWidth = signal<number>(1280);
  readonly isMemberOpen = signal<boolean>(false);

  /**
   * Tính toán max width thực tế cho navigation pane dựa trên không gian container thật,
   * luôn đảm bảo main content không bị ép dưới MAIN_MIN_WIDTH (360px).
   * Trên màn hình >= 1280px, member pane chiếm không gian trong dòng (in-flow),
   * còn dưới 1280px member pane là fixed overlay nên không chiếm flex space của container.
   */
  readonly effectiveMaxNavWidth = computed(() => {
    const extraPanes =
      this.containerWidth() >= 1280 && this.isMemberOpen()
        ? this.memberWidth()
        : 0;
    const available =
      this.containerWidth() -
      SERVER_RAIL_WIDTH -
      MAIN_MIN_WIDTH -
      extraPanes -
      LAYOUT_GAP_AND_PADDING;

    return Math.max(NAV_MIN_WIDTH, Math.min(NAV_MAX_WIDTH, Math.floor(available)));
  });

  /**
   * Chỉ kích hoạt compact mode khi containerWidth nhỏ hơn breakpoint mobile 768px.
   * Tablet (>= 768px) và laptop/desktop luôn giữ desktop navigation layout.
   */
  readonly shouldForceCompact = computed(() => {
    return this.containerWidth() < MOBILE_BREAKPOINT;
  });

  constructor() {
    this.loadPreferences();
  }

  updateContainerWidth(width: number): void {
    if (width <= 0 || width === this.containerWidth()) return;
    this.containerWidth.set(width);

    // Tự động clamp lại navWidth nếu container bị thu nhỏ
    const currentMax = this.effectiveMaxNavWidth();
    if (currentMax >= NAV_MIN_WIDTH && this.navWidth() > currentMax) {
      this.navWidth.set(currentMax);
    }
  }

  setIsMemberOpen(open: boolean): void {
    this.isMemberOpen.set(open);
    const currentMax = this.effectiveMaxNavWidth();
    if (currentMax >= NAV_MIN_WIDTH && this.navWidth() > currentMax) {
      this.navWidth.set(currentMax);
    }
  }

  setNavWidth(width: number): void {
    const maxBound = Math.max(NAV_MIN_WIDTH, this.effectiveMaxNavWidth());
    const clamped = Math.max(NAV_MIN_WIDTH, Math.min(maxBound, Math.round(width)));
    this.navWidth.set(clamped);
  }

  setMemberWidth(width: number): void {
    const clamped = Math.max(MEMBER_MIN_WIDTH, Math.min(MEMBER_MAX_WIDTH, Math.round(width)));
    this.memberWidth.set(clamped);
  }

  resetNavWidth(): void {
    this.navWidth.set(NAV_DEFAULT_WIDTH);
    this.savePreferences();
  }

  resetMemberWidth(): void {
    this.memberWidth.set(MEMBER_DEFAULT_WIDTH);
    this.savePreferences();
  }

  adjustNavWidth(delta: number): void {
    this.setNavWidth(this.navWidth() + delta);
    this.savePreferences();
  }

  adjustMemberWidth(delta: number): void {
    this.setMemberWidth(this.memberWidth() + delta);
    this.savePreferences();
  }

  loadPreferences(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      let raw = localStorage.getItem(LAYOUT_STORAGE_KEY_V2);

      // Migration an toàn từ V1 legacy nếu V2 chưa có
      if (!raw) {
        const legacyRaw = localStorage.getItem(LAYOUT_STORAGE_KEY_V1_LEGACY);
        if (legacyRaw) {
          const parsedLegacy = JSON.parse(legacyRaw) as Partial<DashboardLayoutPreferences>;
          if (
            typeof parsedLegacy.navWidth === 'number' &&
            parsedLegacy.navWidth >= NAV_MIN_WIDTH &&
            parsedLegacy.navWidth <= NAV_MAX_WIDTH &&
            typeof parsedLegacy.memberWidth === 'number' &&
            parsedLegacy.memberWidth >= MEMBER_MIN_WIDTH &&
            parsedLegacy.memberWidth <= MEMBER_MAX_WIDTH
          ) {
            raw = legacyRaw;
          }
          // Xóa legacy key sau khi đọc
          localStorage.removeItem(LAYOUT_STORAGE_KEY_V1_LEGACY);
        }
      }

      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<DashboardLayoutPreferences>;
      if (typeof parsed.navWidth === 'number' && !isNaN(parsed.navWidth)) {
        this.setNavWidth(parsed.navWidth);
      }
      if (typeof parsed.memberWidth === 'number' && !isNaN(parsed.memberWidth)) {
        this.setMemberWidth(parsed.memberWidth);
      }
    } catch {
      // Corrupted preference: keep defaults safely
      this.navWidth.set(NAV_DEFAULT_WIDTH);
      this.memberWidth.set(MEMBER_DEFAULT_WIDTH);
    }
  }

  savePreferences(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const payload: DashboardLayoutPreferences = {
        navWidth: this.navWidth(),
        memberWidth: this.memberWidth(),
      };
      localStorage.setItem(LAYOUT_STORAGE_KEY_V2, JSON.stringify(payload));
    } catch {
      // Storage unavailable or full
    }
  }
}
