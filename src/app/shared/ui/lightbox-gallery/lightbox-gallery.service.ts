import { inject, Injectable, OnDestroy } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LightboxGalleryModal } from './lightbox-gallery-modal';
import type { LightboxGalleryConfig } from './lightbox-gallery.types';

@Injectable({
  providedIn: 'root',
})
export class LightboxGalleryService implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly router = inject(Router);
  private readonly subs = new Subscription();

  private overlayRef: OverlayRef | null = null;

  constructor() {
    // Tự động đóng overlay khi người dùng chuyển trang / đổi URL
    this.subs.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.close();
        }
      }),
    );
  }

  /**
   * Mở Lightbox Gallery toàn màn hình bằng Angular CDK Overlay
   */
  open(config: LightboxGalleryConfig): OverlayRef {
    // Nếu đang có gallery mở -> đóng cái cũ
    this.close();

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'nexus-lightbox-cdk-backdrop',
      panelClass: 'nexus-lightbox-cdk-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay
        .position()
        .global()
        .centerHorizontally()
        .centerVertically(),
    });

    const portal = new ComponentPortal(LightboxGalleryModal);
    const componentRef = this.overlayRef.attach(portal);

    componentRef.setInput('config', config);

    this.subs.add(
      componentRef.instance.closed.subscribe(() => {
        this.close();
      }),
    );

    this.subs.add(
      this.overlayRef.backdropClick().subscribe(() => {
        this.close();
      }),
    );

    return this.overlayRef;
  }

  /**
   * Đóng và giải phóng hoàn toàn CDK Overlay
   */
  close(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  isOpen(): boolean {
    return Boolean(this.overlayRef && this.overlayRef.hasAttached());
  }

  ngOnDestroy(): void {
    this.close();
    this.subs.unsubscribe();
  }
}
