import { afterNextRender, Injector, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ChatScrollControllerOptions {
  getContainer: () => HTMLElement | null | undefined;
  getContentWrapper?: () => HTMLElement | null | undefined;
  injector: Injector;
  platformId: object;
  threshold?: number;
  onPillChange?: (showPill: boolean, count: number) => void;
  runAfterRender?: (fn: () => void) => void;
}

interface SettlingSession {
  targetKey: string;
  generation: number;
  observer: ResizeObserver | null;
  cleanups: (() => void)[];
  isDisconnected: boolean;
}

/**
 * Quản lý vòng đời cuộn thông minh cho khung chat (DM, Server Text Channel, Voice Chat Drawer):
 * 1. Phân biệt rạch ròi Initial History vs Realtime Message.
 * 2. Instant Scroll khi mở/chuyển target sau khi Angular DOM render xong.
 * 3. Chụp trạng thái Near-Bottom TRƯỚC khi DOM mutation diễn ra.
 * 4. Settling ResizeObserver theo dõi ảnh/media tải chậm và tự ngắt khi người dùng cuộn lên hoặc khi hoàn tất.
 * 5. Generation Guard kép chống race condition khi chuyển target nhanh.
 * 6. Scoped Settling Sessions cô lập hoàn toàn callback observer cross-generation.
 * 7. Pagination Prepend Anchor bảo toàn vị trí mắt đọc.
 * 8. SSR-safe và không sử dụng fixed guesswork timers.
 * 9. Cung cấp Signals canonical: isNearBottom, showScrollDownButton, unreadCount.
 */
export class ChatScrollController {
  private readonly getContainer: () => HTMLElement | null | undefined;
  private readonly getContentWrapper?: () => HTMLElement | null | undefined;
  private readonly injector: Injector;
  private readonly isBrowser: boolean;
  private readonly threshold: number;
  private readonly onPillChange?: (showPill: boolean, count: number) => void;
  private readonly customRunner?: (fn: () => void) => void;

  private currentTargetKey: string | null = null;
  private currentGeneration = 0;
  private initialScrolled = false;
  private userScrolledUp = false;
  private unreadBelowCount = 0;
  private currentSettlingSession: SettlingSession | null = null;
  private isDestroyed = false;

  // Canonical Signals cho UI
  readonly isNearBottom = signal<boolean>(true);
  readonly showScrollDownButton = signal<boolean>(false);
  readonly unreadCount = signal<number>(0);

  constructor(options: ChatScrollControllerOptions) {
    this.getContainer = options.getContainer;
    this.getContentWrapper = options.getContentWrapper;
    this.injector = options.injector;
    this.isBrowser = isPlatformBrowser(options.platformId);
    this.threshold = options.threshold ?? 120;
    this.onPillChange = options.onPillChange;
    this.customRunner = options.runAfterRender;
  }

  get generation(): number {
    return this.currentGeneration;
  }

  get targetKey(): string | null {
    return this.currentTargetKey;
  }

  get hasScrolledInitial(): boolean {
    return this.initialScrolled;
  }

  get isUserScrolledUp(): boolean {
    return this.userScrolledUp;
  }

  /**
   * Reset trạng thái cuộn khi chuyển target (conversation/channel mới)
   */
  reset(targetKey: string | null): number {
    this.disconnectSettling();
    this.currentGeneration++;
    this.currentTargetKey = targetKey;
    this.initialScrolled = false;
    this.userScrolledUp = false;
    this.unreadBelowCount = 0;
    this.unreadCount.set(0);
    this.isNearBottom.set(true);
    this.showScrollDownButton.set(false);
    this.onPillChange?.(false, 0);
    return this.currentGeneration;
  }

  /**
   * Thực hiện Instant Scroll xuống đáy sau khi initial history đã render vào DOM
   */
  handleInitialRender(targetKey: string, generation: number): void {
    if (!this.isBrowser || this.isDestroyed) return;
    if (this.currentTargetKey !== targetKey || this.currentGeneration !== generation) return;
    if (this.initialScrolled) return;

    this.runAfterRender(() => {
      if (this.currentTargetKey !== targetKey || this.currentGeneration !== generation) return;
      const el = this.getContainer();
      if (!el) return;

      // Instant scroll xuống đáy
      this.setScrollTop(el, el.scrollHeight);
      this.initialScrolled = true;
      this.userScrolledUp = false;
      this.unreadBelowCount = 0;
      this.unreadCount.set(0);
      this.isNearBottom.set(true);
      this.showScrollDownButton.set(false);
      this.onPillChange?.(false, 0);

      // Ghim lại đáy qua vài animation frame kế tiếp: layout của list (reply,
      // embed, reaction, avatar, font...) thường giãn chiều cao SAU paint đầu tiên
      // nên một lần scroll duy nhất hay dừng ở lưng chừng.
      this.pinAcrossFrames(targetKey, generation, 5);

      // Settling observer bám đáy cho tới khi chiều cao ổn định hoặc media tải xong
      this.setupSettlingObserver(targetKey, generation);
    });
  }

  /**
   * Ghim đáy liên tục qua `frames` khung hình kế tiếp để bắt các lần giãn layout
   * muộn (nội dung render bất đồng bộ). Dừng ngay khi người dùng cuộn lên hoặc
   * đổi target/generation.
   */
  private pinAcrossFrames(targetKey: string, generation: number, frames: number): void {
    if (!this.isBrowser || typeof requestAnimationFrame === 'undefined') return;
    let remaining = frames;
    const step = () => {
      if (
        this.isDestroyed ||
        this.currentTargetKey !== targetKey ||
        this.currentGeneration !== generation ||
        this.userScrolledUp
      ) {
        return;
      }
      const el = this.getContainer();
      if (el) this.setScrollTop(el, el.scrollHeight);
      remaining--;
      if (remaining > 0) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /**
   * Chụp trạng thái vị trí đọc TRƯỚC khi một tin nhắn realtime mới được append vào DOM
   */
  capturePreMutationState(): { wasNearBottom: boolean; distanceToBottom: number } {
    const el = this.getContainer();
    if (!el || !this.isBrowser) {
      return { wasNearBottom: !this.userScrolledUp, distanceToBottom: 0 };
    }
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const wasNearBottom = !this.userScrolledUp && distanceToBottom < this.threshold;
    return { wasNearBottom, distanceToBottom };
  }

  /**
   * Xử lý cuộn sau khi nhận tin nhắn realtime mới
   */
  handleRealtimeAppend(
    targetKey: string,
    generation: number,
    opts: { isMine: boolean; wasNearBottom: boolean; count?: number },
  ): void {
    if (!this.isBrowser || this.isDestroyed) return;
    if (this.currentTargetKey !== targetKey || this.currentGeneration !== generation) return;

    if (opts.isMine || opts.wasNearBottom) {
      this.runAfterRender(() => {
        if (this.currentTargetKey !== targetKey || this.currentGeneration !== generation) return;
        this.scrollToBottom('smooth');
        this.isNearBottom.set(true);
        this.showScrollDownButton.set(false);
        this.unreadBelowCount = 0;
        this.unreadCount.set(0);
        this.onPillChange?.(false, 0);
      });
    } else {
      // Người dùng đang đọc lịch sử phía trên: giữ nguyên vị trí, tăng unread count & hiển thị nút cuộn
      const delta = opts.count ?? 1;
      this.unreadBelowCount += delta;
      this.unreadCount.set(this.unreadBelowCount);
      this.isNearBottom.set(false);
      this.showScrollDownButton.set(true);
      this.onPillChange?.(true, this.unreadBelowCount);
    }
  }

  /**
   * Lắng nghe sự kiện scroll của người dùng để cập nhật trạng thái near-bottom & nút cuộn
   */
  onScroll(): void {
    const el = this.getContainer();
    if (!el || !this.isBrowser || this.isDestroyed) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNear = distanceToBottom < this.threshold;

    if (distanceToBottom > 80) {
      // Người dùng đã chủ động cuộn lên -> ngắt settling observer ngay lập tức
      this.userScrolledUp = true;
      this.disconnectSettling();
    } else {
      this.userScrolledUp = false;
    }

    this.isNearBottom.set(isNear);
    this.showScrollDownButton.set(!isNear);

    if (isNear) {
      this.unreadBelowCount = 0;
      this.unreadCount.set(0);
      this.onPillChange?.(false, 0);
    }
  }

  /**
   * API canonical: Cuộn tới tin nhắn mới nhất và cập nhật trạng thái
   */
  scrollToLatest(behavior: ScrollBehavior = 'smooth'): void {
    this.runAfterRender(() => {
      this.scrollToBottom(behavior);
      this.isNearBottom.set(true);
      this.showScrollDownButton.set(false);
      this.unreadBelowCount = 0;
      this.unreadCount.set(0);
      this.onPillChange?.(false, 0);
    });
  }

  /**
   * Cuộn xuống đáy (Smooth hoặc Auto/Instant)
   */
  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const el = this.getContainer();
    if (!el || !this.isBrowser) return;

    // Tôn trọng prefers-reduced-motion
    let effectiveBehavior = behavior;
    if (
      behavior === 'smooth' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    ) {
      effectiveBehavior = 'auto';
    }

    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: effectiveBehavior });
    } else {
      el.scrollTop = el.scrollHeight;
    }

    this.userScrolledUp = false;
    this.unreadBelowCount = 0;
    this.unreadCount.set(0);
    this.isNearBottom.set(true);
    this.showScrollDownButton.set(false);
    this.onPillChange?.(false, 0);
  }

  /**
   * Bảo toàn vị trí mắt đọc khi phân trang tải tin nhắn cũ lên đầu (Pagination Prepend)
   */
  preserveScrollOnPrepend(
    prevScrollHeight: number,
    prevScrollTop: number,
    targetKey: string,
    generation: number,
  ): void {
    if (!this.isBrowser || this.isDestroyed) return;
    if (this.currentTargetKey !== targetKey || this.currentGeneration !== generation) return;

    this.runAfterRender(() => {
      if (this.currentTargetKey !== targetKey || this.currentGeneration !== generation) return;
      const el = this.getContainer();
      if (!el) return;

      const newScrollHeight = el.scrollHeight;
      const newScrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      this.setScrollTop(el, newScrollTop);
    });
  }

  /**
   * Thiết lập ResizeObserver trên content wrapper và theo dõi media tải chậm
   * để bảo toàn vị trí dưới cùng cho đến khi toàn bộ media hoàn tất,
   * người dùng cuộn lên, hoặc đổi target/generation.
   */
  private setupSettlingObserver(targetKey: string, generation: number): void {
    if (typeof ResizeObserver === 'undefined' || !this.isBrowser) return;
    this.disconnectSettling();

    const container = this.getContainer();
    if (!container) return;

    const session: SettlingSession = {
      targetKey,
      generation,
      observer: null,
      cleanups: [],
      isDisconnected: false,
    };
    this.currentSettlingSession = session;

    const disconnectSession = () => {
      if (session.isDisconnected) return;
      session.isDisconnected = true;
      if (session.observer) {
        session.observer.disconnect();
        session.observer = null;
      }
      for (const cleanup of session.cleanups) {
        cleanup();
      }
      session.cleanups = [];
      if (this.currentSettlingSession === session) {
        this.currentSettlingSession = null;
      }
    };

    // Ghim đáy nếu vẫn đúng target và người dùng chưa cuộn lên; ngược lại dừng hẳn.
    const pinToBottom = (): void => {
      if (
        session.isDisconnected ||
        this.isDestroyed ||
        this.currentTargetKey !== targetKey ||
        this.currentGeneration !== generation ||
        this.userScrolledUp
      ) {
        disconnectSession();
        return;
      }
      const el = this.getContainer();
      if (el) this.setScrollTop(el, el.scrollHeight);
    };

    const pendingImages = Array.from(container.querySelectorAll('img')).filter(
      (img) => !img.complete,
    );

    // Hard cap: không bao giờ giữ observer quá MAX_MS.
    const MAX_MS = 3000;
    const hardTimer = setTimeout(disconnectSession, MAX_MS);
    session.cleanups.push(() => clearTimeout(hardTimer));

    // Idle teardown CHỈ dùng cho nội dung không-ảnh (text/reply/embed reflow):
    // khi chiều cao ngừng đổi trong IDLE_MS thì coi là đã ổn định và dừng.
    // Có ảnh thì teardown theo tiến độ tải ảnh (bên dưới), không dùng idle để
    // tránh dừng sớm khi ảnh tải > IDLE_MS.
    const IDLE_MS = 400;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const armIdle = (): void => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(disconnectSession, IDLE_MS);
    };
    session.cleanups.push(() => {
      if (idleTimer) clearTimeout(idleTimer);
    });

    // Quan sát content wrapper thay vì scroll container có viewport cố định.
    // KHÔNG thoát sớm khi không có ảnh: nội dung vẫn có thể giãn chiều cao sau
    // paint đầu tiên (đây chính là nguyên nhân chat dừng ở lưng chừng).
    const targetElement =
      this.getContentWrapper?.() ||
      (container.firstElementChild as HTMLElement) ||
      container;

    const observer = new ResizeObserver(() => {
      pinToBottom();
      if (!session.isDisconnected && pendingImages.length === 0) armIdle();
    });
    session.observer = observer;
    observer.observe(targetElement);

    if (pendingImages.length === 0) {
      armIdle();
      return;
    }

    // Có ảnh: bám đáy khi từng ảnh settle, dừng hẳn khi ảnh cuối cùng xong.
    let remaining = pendingImages.length;
    for (const img of pendingImages) {
      let isSettled = false;
      const onMediaSettled = () => {
        if (isSettled) return;
        isSettled = true;

        if (
          session.isDisconnected ||
          this.isDestroyed ||
          this.currentTargetKey !== targetKey ||
          this.currentGeneration !== generation
        ) {
          return;
        }

        remaining--;
        if (!this.userScrolledUp) {
          const el = this.getContainer();
          if (el) this.setScrollTop(el, el.scrollHeight);
        }
        if (remaining <= 0) {
          disconnectSession();
        }
      };

      if (typeof img.decode === 'function') {
        img.decode().then(onMediaSettled).catch(onMediaSettled);
      } else {
        img.addEventListener('load', onMediaSettled, { once: true });
        img.addEventListener('error', onMediaSettled, { once: true });
        session.cleanups.push(() => {
          img.removeEventListener('load', onMediaSettled);
          img.removeEventListener('error', onMediaSettled);
        });
      }
    }
  }

  private disconnectSettling(): void {
    if (this.currentSettlingSession) {
      this.currentSettlingSession.isDisconnected = true;
      if (this.currentSettlingSession.observer) {
        this.currentSettlingSession.observer.disconnect();
        this.currentSettlingSession.observer = null;
      }
      for (const cleanup of this.currentSettlingSession.cleanups) {
        cleanup();
      }
      this.currentSettlingSession.cleanups = [];
      this.currentSettlingSession = null;
    }
  }

  private setScrollTop(el: HTMLElement, top: number): void {
    el.scrollTop = top;
  }

  private runAfterRender(fn: () => void): void {
    if (!this.isBrowser || this.isDestroyed) return;
    if (this.customRunner) {
      this.customRunner(fn);
      return;
    }
    afterNextRender(
      () => {
        if (!this.isDestroyed) {
          fn();
        }
      },
      { injector: this.injector },
    );
  }

  destroy(): void {
    this.isDestroyed = true;
    this.disconnectSettling();
  }
}
