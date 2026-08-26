import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { ChatScrollController } from './chat-scroll.controller';

describe('ChatScrollController', () => {
  let controller: ChatScrollController;
  let mockElement: HTMLElement;
  let mockWrapper: HTMLElement;
  let mockInjector: Injector;
  let pillState: { showPill: boolean; count: number };

  function setElementDimensions(
    el: HTMLElement,
    scrollHeight: number,
    clientHeight: number,
    scrollTop = 0,
  ) {
    Object.defineProperty(el, 'scrollHeight', {
      value: scrollHeight,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(el, 'clientHeight', {
      value: clientHeight,
      configurable: true,
      writable: true,
    });
    el.scrollTop = scrollTop;
  }

  beforeEach(() => {
    pillState = { showPill: false, count: 0 };
    mockElement = document.createElement('div');
    mockWrapper = document.createElement('div');
    mockElement.appendChild(mockWrapper);
    setElementDimensions(mockElement, 1000, 400, 0);

    mockInjector = TestBed.inject(Injector);

    controller = new ChatScrollController({
      getContainer: () => mockElement,
      getContentWrapper: () => mockWrapper,
      injector: mockInjector,
      platformId: 'browser' as unknown as object,
      threshold: 120,
      runAfterRender: (fn) => fn(),
      onPillChange: (show, count) => {
        pillState = { showPill: show, count };
      },
    });
  });

  afterEach(() => {
    controller.destroy();
  });

  it('khởi tạo với generation = 0 và initialScrolled = false', () => {
    expect(controller.generation).toBe(0);
    expect(controller.hasScrolledInitial).toBe(false);
    expect(controller.targetKey).toBeNull();
    expect(controller.isNearBottom()).toBe(true);
    expect(controller.showScrollDownButton()).toBe(false);
    expect(controller.unreadCount()).toBe(0);
  });

  it('reset() tăng generation và reset flags & signals', () => {
    const gen1 = controller.reset('conv-1');
    expect(gen1).toBe(1);
    expect(controller.targetKey).toBe('conv-1');
    expect(controller.hasScrolledInitial).toBe(false);
    expect(controller.unreadCount()).toBe(0);
    expect(controller.showScrollDownButton()).toBe(false);
    expect(controller.isNearBottom()).toBe(true);
    expect(pillState.showPill).toBe(false);

    const gen2 = controller.reset('conv-2');
    expect(gen2).toBe(2);
    expect(controller.targetKey).toBe('conv-2');
  });

  it('handleInitialRender() thực hiện instant scroll xuống đáy và gán initialScrolled = true', () => {
    const gen = controller.reset('conv-1');
    setElementDimensions(mockElement, 1200, 400, 0);

    controller.handleInitialRender('conv-1', gen);

    expect(mockElement.scrollTop).toBe(1200);
    expect(controller.hasScrolledInitial).toBe(true);
    expect(controller.showScrollDownButton()).toBe(false);
    expect(controller.isNearBottom()).toBe(true);
    expect(pillState.showPill).toBe(false);
  });

  it('handleInitialRender() bỏ qua nếu generation hoặc targetKey không khớp', () => {
    const gen = controller.reset('conv-1');
    setElementDimensions(mockElement, 1200, 400, 0);

    // Gọi với generation cũ
    controller.handleInitialRender('conv-1', gen - 1);
    expect(mockElement.scrollTop).toBe(0);
    expect(controller.hasScrolledInitial).toBe(false);

    // Gọi với targetKey khác
    controller.handleInitialRender('conv-2', gen);
    expect(mockElement.scrollTop).toBe(0);
    expect(controller.hasScrolledInitial).toBe(false);
  });

  it('capturePreMutationState() đo chính xác wasNearBottom trước khi mutate DOM', () => {
    controller.reset('conv-1');

    // Đang ở đáy: scrollTop = 600 -> distance = 1000 - 600 - 400 = 0 (< 120)
    setElementDimensions(mockElement, 1000, 400, 600);
    expect(controller.capturePreMutationState().wasNearBottom).toBe(true);

    // Đang cuộn lên: scrollTop = 100 -> distance = 1000 - 100 - 400 = 500 (> 120)
    setElementDimensions(mockElement, 1000, 400, 100);
    expect(controller.capturePreMutationState().wasNearBottom).toBe(false);
  });

  it('handleRealtimeAppend() cuộn xuống đáy nếu là tin của chính mình (isMine = true)', () => {
    const gen = controller.reset('conv-1');
    setElementDimensions(mockElement, 1500, 400, 200);

    controller.handleRealtimeAppend('conv-1', gen, {
      isMine: true,
      wasNearBottom: false,
    });

    expect(mockElement.scrollTop).toBe(1500);
    expect(pillState.showPill).toBe(false);
    expect(controller.unreadCount()).toBe(0);
    expect(controller.showScrollDownButton()).toBe(false);
  });

  it('handleRealtimeAppend() giữ nguyên vị trí và bật showScrollDownButton nếu người khác gửi và wasNearBottom = false', () => {
    const gen = controller.reset('conv-1');
    setElementDimensions(mockElement, 1500, 400, 200);

    controller.handleRealtimeAppend('conv-1', gen, {
      isMine: false,
      wasNearBottom: false,
      count: 2,
    });

    // Không bị cuộn xuống
    expect(mockElement.scrollTop).toBe(200);
    // Pill và signal showScrollDownButton bật
    expect(pillState.showPill).toBe(true);
    expect(pillState.count).toBe(2);
    expect(controller.unreadCount()).toBe(2);
    expect(controller.showScrollDownButton()).toBe(true);
    expect(controller.isNearBottom()).toBe(false);
  });

  it('scrollToLatest() cuộn xuống đáy, reset unreadCount và ẩn nút cuộn', () => {
    controller.reset('conv-1');
    setElementDimensions(mockElement, 2000, 400, 500);
    controller.onScroll();
    expect(controller.showScrollDownButton()).toBe(true);

    controller.scrollToLatest('smooth');

    expect(mockElement.scrollTop).toBe(2000);
    expect(controller.showScrollDownButton()).toBe(false);
    expect(controller.unreadCount()).toBe(0);
    expect(controller.isNearBottom()).toBe(true);
  });

  it('preserveScrollOnPrepend() bảo toàn vị trí mắt đọc theo scrollHeight delta', () => {
    const gen = controller.reset('conv-1');
    const oldScrollHeight = 1000;
    const oldScrollTop = 50;

    // DOM sau prepend tăng chiều cao lên 1800
    setElementDimensions(mockElement, 1800, 400, oldScrollTop);

    controller.preserveScrollOnPrepend(oldScrollHeight, oldScrollTop, 'conv-1', gen);

    // newScrollTop = 1800 - 1000 + 50 = 850
    expect(mockElement.scrollTop).toBe(850);
  });

  it('onScroll() cập nhật isNearBottom và showScrollDownButton', () => {
    controller.reset('conv-1');
    setElementDimensions(mockElement, 1000, 400, 100); // distance = 500 > 120

    controller.onScroll();
    expect(controller.isUserScrolledUp).toBe(true);
    expect(controller.isNearBottom()).toBe(false);
    expect(controller.showScrollDownButton()).toBe(true);

    // Cuộn lại gần đáy
    setElementDimensions(mockElement, 1000, 400, 550); // distance = 50 < 120
    controller.onScroll();
    expect(controller.isUserScrolledUp).toBe(false);
    expect(controller.isNearBottom()).toBe(true);
    expect(controller.showScrollDownButton()).toBe(false);
    expect(pillState.showPill).toBe(false);
  });

  it('settling: không có ảnh pending thì observer được dọn dẹp ngay lập tức', () => {
    let observed = false;
    class MockResizeObserver {
      observe() {
        observed = true;
      }
      disconnect() {
        observed = false;
      }
      unobserve() {}
    }
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    // Không có thẻ img nào
    const gen = controller.reset('conv-1');
    controller.handleInitialRender('conv-1', gen);

    // Observer không bị giữ lại active
    expect(observed).toBe(false);
  });

  it('settling: fake img pending với deferred decode, observer active qua nhiều resize và dừng khi decode hoàn tất', async () => {
    let resizeCallback: (() => void) | undefined;
    class MockResizeObserver {
      constructor(callback: () => void) {
        resizeCallback = callback;
      }
      observe() {}
      disconnect() {
        resizeCallback = undefined;
      }
      unobserve() {}
    }
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    // Tạo deferred promise cho img decode
    let resolveDecode!: () => void;
    const decodePromise = new Promise<void>((resolve) => {
      resolveDecode = resolve;
    });

    const fakeImg = document.createElement('img');
    Object.defineProperty(fakeImg, 'complete', { value: false });
    fakeImg.decode = () => decodePromise;
    mockElement.appendChild(fakeImg);

    const gen = controller.reset('conv-1');
    setElementDimensions(mockElement, 1000, 400, 0);
    controller.handleInitialRender('conv-1', gen);

    expect(mockElement.scrollTop).toBe(1000);
    expect(resizeCallback).toBeDefined();

    // Resize 1: Kích thước tăng lên 1500 trước khi decode
    setElementDimensions(mockElement, 1500, 400, 1000);
    resizeCallback?.();
    expect(mockElement.scrollTop).toBe(1500);

    // Resolve decode của ảnh
    resolveDecode();
    await decodePromise;

    // Sau khi decode xong toàn bộ pending images, observer đã disconnect
    expect(resizeCallback).toBeUndefined();
  });

  it('settling: reset từ target A sang B, resolve decode của A không làm disconnect observer của B', async () => {
    let currentObserverInstance: any;
    let disconnectCallCount = 0;
    class MockResizeObserver {
      constructor(public callback: () => void) {
        currentObserverInstance = this;
      }
      observe() {}
      disconnect() {
        disconnectCallCount++;
        currentObserverInstance = undefined;
      }
      unobserve() {}
    }
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    // Deferred promise cho target A
    let resolveDecodeA!: () => void;
    const decodePromiseA = new Promise<void>((resolve) => {
      resolveDecodeA = resolve;
    });
    const fakeImgA = document.createElement('img');
    Object.defineProperty(fakeImgA, 'complete', { value: false });
    fakeImgA.decode = () => decodePromiseA;
    mockElement.appendChild(fakeImgA);

    // 1. Initial target A
    const genA = controller.reset('target-A');
    controller.handleInitialRender('target-A', genA);
    expect(currentObserverInstance).toBeDefined();

    // 2. Chuyển sang target B với deferred decode B
    mockElement.removeChild(fakeImgA);
    let resolveDecodeB!: () => void;
    const decodePromiseB = new Promise<void>((resolve) => {
      resolveDecodeB = resolve;
    });
    const fakeImgB = document.createElement('img');
    Object.defineProperty(fakeImgB, 'complete', { value: false });
    fakeImgB.decode = () => decodePromiseB;
    mockElement.appendChild(fakeImgB);

    const genB = controller.reset('target-B');
    controller.handleInitialRender('target-B', genB);
    const observerB = currentObserverInstance;
    expect(observerB).toBeDefined();

    // 3. Resolve decode của target A (muộn)
    resolveDecodeA();
    await decodePromiseA;

    // Observer của B vẫn sống, không bị A disconnect
    expect(currentObserverInstance).toBe(observerB);

    // 4. Resolve decode của B
    resolveDecodeB();
    await decodePromiseB;
    expect(currentObserverInstance).toBeUndefined();
  });

  it('prefers-reduced-motion: reduce chuyển behavior sang auto khi gọi scrollToBottom', () => {
    let lastBehavior: ScrollBehavior | undefined;
    mockElement.scrollTo = ((options: ScrollToOptions) => {
      lastBehavior = options.behavior;
      mockElement.scrollTop = options.top ?? 0;
    }) as any;

    // Mock matchMedia prefers-reduced-motion: reduce
    (window as unknown as { matchMedia: unknown }).matchMedia = (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });

    controller.reset('conv-1');
    controller.scrollToBottom('smooth');

    expect(lastBehavior).toBe('auto');
  });

  it('settling: queued ResizeObserver callback của generation A không làm disconnect session hoặc media listeners của B', () => {
    let callbackA: (() => void) | undefined;
    let callbackB: (() => void) | undefined;
    let instanceCount = 0;

    class MockResizeObserver {
      public id: number;
      constructor(public cb: () => void) {
        this.id = ++instanceCount;
        if (this.id === 1) callbackA = cb;
        if (this.id === 2) callbackB = cb;
      }
      observe() {}
      disconnect() {
        if (this.id === 1) callbackA = undefined;
        if (this.id === 2) callbackB = undefined;
      }
      unobserve() {}
    }
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    // 1. Setup target A với pending image
    const fakeImgA = document.createElement('img');
    Object.defineProperty(fakeImgA, 'complete', { value: false });
    mockElement.appendChild(fakeImgA);

    const genA = controller.reset('target-A');
    controller.handleInitialRender('target-A', genA);
    expect(callbackA).toBeDefined();

    // 2. Reset sang target B với pending image B
    mockElement.removeChild(fakeImgA);
    const fakeImgB = document.createElement('img');
    Object.defineProperty(fakeImgB, 'complete', { value: false });
    mockElement.appendChild(fakeImgB);

    const genB = controller.reset('target-B');
    controller.handleInitialRender('target-B', genB);
    expect(callbackB).toBeDefined();

    // 3. Callback ResizeObserver của target A chạy muộn
    callbackA?.();

    // 4. Callback B và observer session của B vẫn sống nguyên vẹn
    expect(callbackB).toBeDefined();

    // 5. Trigger resize trên session B -> ghim đúng đáy
    setElementDimensions(mockElement, 1800, 400, 1000);
    callbackB?.();
    expect(mockElement.scrollTop).toBe(1800);

    // 6. Media listener của B vẫn hoạt động và disconnect session B khi ảnh tải xong
    fakeImgB.dispatchEvent(new Event('load'));
    expect(callbackB).toBeUndefined();
  });
});
