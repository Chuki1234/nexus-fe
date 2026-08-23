import { TestBed } from '@angular/core/testing';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LightboxGalleryService } from './lightbox-gallery.service';

describe('LightboxGalleryService', () => {
  let service: LightboxGalleryService;
  let overlayMock: any;
  let routerEvents$: Subject<any>;
  let mockOverlayRef: any;

  beforeEach(() => {
    routerEvents$ = new Subject();

    mockOverlayRef = {
      attach: vi.fn().mockReturnValue({
        setInput: vi.fn(),
        instance: {
          closed: new Subject(),
        },
      }),
      backdropClick: vi.fn().mockReturnValue(new Subject()),
      dispose: vi.fn(),
      hasAttached: vi.fn().mockReturnValue(true),
    };

    overlayMock = {
      create: vi.fn().mockReturnValue(mockOverlayRef),
      scrollStrategies: {
        block: vi.fn().mockReturnValue({}),
      },
      position: vi.fn().mockReturnValue({
        global: vi.fn().mockReturnValue({
          centerHorizontally: vi.fn().mockReturnValue({
            centerVertically: vi.fn().mockReturnValue({}),
          }),
        }),
      }),
    };

    TestBed.configureTestingModule({
      imports: [OverlayModule],
      providers: [
        LightboxGalleryService,
        { provide: Overlay, useValue: overlayMock },
        { provide: Router, useValue: { events: routerEvents$.asObservable() } },
      ],
    });

    service = TestBed.inject(LightboxGalleryService);
  });

  it('open() tạo CDK Overlay với đúng backdropClass và panelClass', () => {
    const overlayRef = service.open({
      items: [
        {
          messageId: 'msg-1',
          attachmentId: 'att-1',
          filename: 'cat.png',
          mimeType: 'image/png',
          url: 'https://example.com/cat.png',
        },
      ],
    });

    expect(overlayMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hasBackdrop: true,
        backdropClass: 'nexus-lightbox-cdk-backdrop',
        panelClass: 'nexus-lightbox-cdk-panel',
      }),
    );
    expect(mockOverlayRef.attach).toHaveBeenCalled();
    expect(overlayRef).toBe(mockOverlayRef);
    expect(service.isOpen()).toBe(true);
  });

  it('close() dọn dẹp và giải phóng CDK Overlay', () => {
    service.open({ items: [] });
    expect(service.isOpen()).toBe(true);

    service.close();
    expect(mockOverlayRef.dispose).toHaveBeenCalled();
  });

  it('tự động đóng overlay khi người dùng chuyển trang qua Router NavigationStart', () => {
    service.open({ items: [] });
    expect(service.isOpen()).toBe(true);

    routerEvents$.next(new NavigationStart(1, '/channels/@me/new-convo'));
    expect(mockOverlayRef.dispose).toHaveBeenCalled();
  });
});
