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
          <button
            type="button"
            class="mirror-toggle-btn"
            (click)="onToggleMirror($event)"
            title="Lật gương camera"
          >
            <span class="material-icons text-xs">flip</span>
          </button>
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
      }

      .self-view-card.dragging {
        cursor: grabbing;
        transition: none;
        box-shadow:
          0 24px 50px rgba(0, 0, 0, 0.85),
          0 0 0 2px rgba(99, 102, 241, 0.6);
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
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
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

      .mirror-toggle-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 4px;
        color: #ffffff;
        padding: 2px 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .mirror-toggle-btn:hover {
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
  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;

  readonly isDragging = signal<boolean>(false);
  private dragStartX = 0;
  private dragStartY = 0;
  private currentOffsetX = 0;
  private currentOffsetY = 0;

  readonly customTransform = computed(() => {
    if (this.isDragging()) {
      return `translate(${this.currentOffsetX}px, ${this.currentOffsetY}px)`;
    }
    return '';
  });

  ngAfterViewInit(): void {
    if (this.localVideoRef?.nativeElement) {
      this.mediaService.attachLocalVideo(this.localVideoRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    // cleanup
  }

  onToggleMirror(e: MouseEvent): void {
    e.stopPropagation();
    this.store.toggleSelfViewMirror();
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
    this.isDragging.set(true);
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.currentOffsetX = 0;
    this.currentOffsetY = 0;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.isDragging()) {
      this.currentOffsetX = e.clientX - this.dragStartX;
      this.currentOffsetY = e.clientY - this.dragStartY;
    }
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (this.isDragging() && e.touches.length === 1) {
      this.currentOffsetX = e.touches[0].clientX - this.dragStartX;
      this.currentOffsetY = e.touches[0].clientY - this.dragStartY;
    }
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onDragEnd(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);

    if (this.cardRef?.nativeElement) {
      const rect = this.cardRef.nativeElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

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

    this.currentOffsetX = 0;
    this.currentOffsetY = 0;
  }
}
