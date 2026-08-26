import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectCallStore, SelfViewCorner } from '../../../../core/calls/direct-call.store';
import { DirectCallMediaService } from '../../../../core/calls/direct-call-media.service';

@Component({
  selector: 'app-draggable-self-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!store.isVideoMuted()) {
      <div
        #card
        class="self-view-card"
        [ngClass]="[store.selfViewCorner(), isDragging() ? 'dragging' : '']"
        [style.transform]="customTransform()"
        (mousedown)="onMouseDown($event)"
        (touchstart)="onTouchStart($event)"
      >
        <video
          #localVideo
          class="local-video"
          [ngClass]="{ mirrored: store.isSelfViewMirrored() }"
          autoplay
          playsinline
          muted
        ></video>

        <!-- Top bar overlay on hover -->
        <div class="card-overlay">
          <div class="corner-label">Bạn</div>
          <div class="overlay-actions">
            <button
              type="button"
              class="overlay-btn"
              (click)="onCycleCorner($event)"
              title="Đổi vị trí góc màn hình"
            >
              <span class="material-icons text-xs">open_with</span>
            </button>
            <button
              type="button"
              class="overlay-btn"
              (click)="onToggleMirror($event)"
              title="Lật gương camera"
            >
              <span class="material-icons text-xs">flip</span>
            </button>
          </div>
        </div>

        @if (store.isAudioMuted()) {
          <div class="local-mute-badge" title="Micro đang tắt">
            <span class="material-icons text-xs">mic_off</span>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .self-view-card {
        position: absolute;
        width: clamp(180px, 20vw, 280px);
        aspect-ratio: 16 / 9;
        background: #0d101a;
        border-radius: 16px;
        overflow: hidden;
        box-shadow:
          0 16px 40px rgba(0, 0, 0, 0.65),
          0 0 0 1px rgba(255, 255, 255, 0.12);
        cursor: grab;
        z-index: 50;
        transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
        user-select: none;
        touch-action: none;
      }

      .self-view-card.dragging {
        cursor: grabbing;
        transition: none !important;
        box-shadow:
          0 24px 50px rgba(0, 0, 0, 0.85),
          0 0 0 2px rgba(99, 102, 241, 0.8);
      }

      .self-view-card.top-left {
        top: 24px;
        left: 24px;
      }
      .self-view-card.top-right {
        top: 24px;
        right: 24px;
      }
      .self-view-card.bottom-left {
        bottom: 100px;
        left: 24px;
      }
      .self-view-card.bottom-right {
        bottom: 100px;
        right: 24px;
      }

      .local-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
      }

      .local-video.mirrored {
        transform: scaleX(-1);
      }

      .card-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 6px 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .self-view-card:hover .card-overlay {
        opacity: 1;
      }

      .corner-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #ffffff;
      }

      .overlay-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .overlay-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 4px;
        color: #ffffff;
        padding: 2px 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }

      .overlay-btn:hover {
        background: rgba(255, 255, 255, 0.35);
      }

      .local-mute-badge {
        position: absolute;
        bottom: 6px;
        right: 6px;
        background: rgba(255, 68, 85, 0.9);
        color: #ffffff;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class DraggableSelfViewComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(DirectCallStore);
  readonly mediaService = inject(DirectCallMediaService);

  @ViewChild('card') cardRef?: ElementRef<HTMLDivElement>;
  @ViewChild('localVideo') set localVideoElement(ref: ElementRef<HTMLVideoElement> | undefined) {
    if (ref?.nativeElement) {
      this.mediaService.attachLocalVideo(ref.nativeElement);
    }
  }

  readonly isDragging = signal<boolean>(false);
  readonly currentOffsetX = signal<number>(0);
  readonly currentOffsetY = signal<number>(0);

  private dragStartX = 0;
  private dragStartY = 0;
  private cardInitialLeft = 0;
  private cardInitialTop = 0;

  readonly customTransform = computed(() => {
    if (this.isDragging()) {
      return `translate3d(${this.currentOffsetX()}px, ${this.currentOffsetY()}px, 0)`;
    }
    return '';
  });

  ngAfterViewInit(): void {
    // Handled via setter
  }

  ngOnDestroy(): void {
    // cleanup
  }

  onToggleMirror(e: MouseEvent): void {
    e.stopPropagation();
    this.store.toggleSelfViewMirror();
  }

  onCycleCorner(e: MouseEvent): void {
    e.stopPropagation();
    const current = this.store.selfViewCorner();
    const cycle: Record<SelfViewCorner, SelfViewCorner> = {
      'bottom-right': 'bottom-left',
      'bottom-left': 'top-left',
      'top-left': 'top-right',
      'top-right': 'bottom-right',
    };
    this.store.setSelfViewCorner(cycle[current] || 'bottom-right');
  }

  onMouseDown(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('button')) return;
    this.startDrag(e.clientX, e.clientY);
  }

  onTouchStart(e: TouchEvent): void {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length === 1) {
      this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  private startDrag(clientX: number, clientY: number): void {
    if (this.cardRef?.nativeElement) {
      const rect = this.cardRef.nativeElement.getBoundingClientRect();
      this.cardInitialLeft = rect.left;
      this.cardInitialTop = rect.top;
    }
    this.isDragging.set(true);
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.currentOffsetX.set(0);
    this.currentOffsetY.set(0);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.isDragging()) {
      this.currentOffsetX.set(e.clientX - this.dragStartX);
      this.currentOffsetY.set(e.clientY - this.dragStartY);
    }
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (this.isDragging() && e.touches.length === 1) {
      this.currentOffsetX.set(e.touches[0].clientX - this.dragStartX);
      this.currentOffsetY.set(e.touches[0].clientY - this.dragStartY);
    }
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onDragEnd(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);

    if (this.cardRef?.nativeElement) {
      const cardWidth = this.cardRef.nativeElement.offsetWidth || 220;
      const cardHeight = this.cardRef.nativeElement.offsetHeight || 124;

      const currentLeft = this.cardInitialLeft + this.currentOffsetX();
      const currentTop = this.cardInitialTop + this.currentOffsetY();

      const centerX = currentLeft + cardWidth / 2;
      const centerY = currentTop + cardHeight / 2;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const isLeft = centerX < screenWidth / 2;
      const isTop = centerY < screenHeight / 2;

      let corner: SelfViewCorner;
      if (isTop && isLeft) corner = 'top-left';
      else if (isTop && !isLeft) corner = 'top-right';
      else if (!isTop && isLeft) corner = 'bottom-left';
      else corner = 'bottom-right';

      this.store.setSelfViewCorner(corner);
    }

    this.currentOffsetX.set(0);
    this.currentOffsetY.set(0);
  }
}
