import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { A11yModule } from '@angular/cdk/a11y';
import type { LightboxGalleryConfig, LightboxMediaItem } from './lightbox-gallery.types';

@Component({
  selector: 'app-lightbox-gallery-modal',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    A11yModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'nexus-lightbox-gallery-host flex flex-col w-full h-full select-none',
    role: 'dialog',
    '[attr.aria-modal]': 'true',
    '[attr.aria-label]': 'activeItem() ? ("Xem ảnh " + activeItem()?.filename) : "Thư viện ảnh"',
  },
  templateUrl: './lightbox-gallery-modal.html',
  styleUrl: './lightbox-gallery-modal.css',
})
export class LightboxGalleryModal implements OnInit, AfterViewInit {
  private readonly elementRef = inject(ElementRef);

  readonly config = input.required<LightboxGalleryConfig>();
  readonly closed = output<void>();

  readonly items = signal<LightboxMediaItem[]>([]);
  readonly activeIndex = signal<number>(0);
  readonly isRetrying = signal<boolean>(false);
  readonly isFailed = signal<boolean>(false);
  readonly isDownloading = signal<boolean>(false);

  private readonly thumbnailStripRef = viewChild<ElementRef<HTMLElement>>('thumbnailStrip');
  private readonly mainImageRef = viewChild<ElementRef<HTMLImageElement>>('mainImage');
  private readonly closeButtonRef = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  readonly activeItem = computed<LightboxMediaItem | null>(() => {
    const list = this.items();
    const idx = this.activeIndex();
    if (idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  });

  readonly totalCount = computed(() => this.items().length);
  readonly counterLabel = computed(() => {
    const total = this.totalCount();
    if (total <= 0) return '';
    return `${this.activeIndex() + 1} / ${total}`;
  });

  readonly hasPrev = computed(() => this.activeIndex() > 0);
  readonly hasNext = computed(() => this.activeIndex() < this.items().length - 1);
  readonly isSingle = computed(() => this.totalCount() <= 1);

  ngOnInit(): void {
    const conf = this.config();
    const list = conf.items || [];
    this.items.set(list);

    let initialIdx = 0;
    if (conf.initialActiveId) {
      const found = list.findIndex(
        (item) =>
          item.messageId === conf.initialActiveId?.messageId &&
          item.attachmentId === conf.initialActiveId?.attachmentId,
      );
      if (found !== -1) {
        initialIdx = found;
      }
    } else if (typeof conf.initialIndex === 'number') {
      initialIdx = Math.max(0, Math.min(conf.initialIndex, list.length - 1));
    }

    this.activeIndex.set(initialIdx);
  }

  ngAfterViewInit(): void {
    this.scrollActiveThumbnailIntoView();
    // Tự động focus vào nút đóng để bảo đảm focus trap
    setTimeout(() => {
      this.closeButtonRef()?.nativeElement?.focus();
    }, 50);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.onClose();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        event.stopPropagation();
        this.onPrev();
        break;
      case 'ArrowRight':
        event.preventDefault();
        event.stopPropagation();
        this.onNext();
        break;
      case 'Home':
        event.preventDefault();
        event.stopPropagation();
        this.onFirst();
        break;
      case 'End':
        event.preventDefault();
        event.stopPropagation();
        this.onLast();
        break;
    }
  }

  onPrev(): void {
    if (this.hasPrev()) {
      this.selectIndex(this.activeIndex() - 1);
    }
  }

  onNext(): void {
    if (this.hasNext()) {
      this.selectIndex(this.activeIndex() + 1);
    }
  }

  onFirst(): void {
    if (this.items().length > 0) {
      this.selectIndex(0);
    }
  }

  onLast(): void {
    const lastIdx = this.items().length - 1;
    if (lastIdx >= 0) {
      this.selectIndex(lastIdx);
    }
  }

  selectIndex(index: number): void {
    if (index < 0 || index >= this.items().length) return;
    this.activeIndex.set(index);
    this.isRetrying.set(false);
    this.isFailed.set(false);
    this.scrollActiveThumbnailIntoView();
  }

  async onImageError(): Promise<void> {
    const active = this.activeItem();
    if (!active) {
      this.isFailed.set(true);
      return;
    }

    const conf = this.config();
    if (!this.isRetrying() && typeof conf.refreshAttachmentUrl === 'function') {
      this.isRetrying.set(true);
      try {
        const freshUrl = await conf.refreshAttachmentUrl(
          active.messageId,
          active.attachmentId,
        );
        if (freshUrl) {
          active.url = freshUrl;
          // Cập nhật lại trong items list
          this.items.update((list) =>
            list.map((item) =>
              item.messageId === active.messageId &&
              item.attachmentId === active.attachmentId
                ? { ...item, url: freshUrl }
                : item,
            ),
          );
          this.isFailed.set(false);
          return;
        }
      } catch {
        // Retry failed
      }
    }

    this.isFailed.set(true);
  }

  async onDownloadClick(event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    const active = this.activeItem();
    if (!active || this.isDownloading()) return;

    this.isDownloading.set(true);
    try {
      const conf = this.config();
      if (typeof conf.onDownload === 'function') {
        await conf.onDownload(active);
      } else {
        await this.fallbackDownload(active);
      }
    } finally {
      this.isDownloading.set(false);
    }
  }

  private async fallbackDownload(item: LightboxMediaItem): Promise<void> {
    try {
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = item.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  }

  onBackdropClick(event: MouseEvent): void {
    // Chỉ đóng khi click trực tiếp vào vùng backdrop trống
    if (
      event.target === event.currentTarget ||
      (event.target as HTMLElement).classList.contains('nexus-lightbox-stage')
    ) {
      this.onClose();
    }
  }

  onClose(): void {
    const opener = this.config().openerElement;
    this.closed.emit();
    if (opener && typeof opener.focus === 'function') {
      try {
        opener.focus();
      } catch {
        // Gracefully ignore
      }
    }
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private scrollActiveThumbnailIntoView(): void {
    setTimeout(() => {
      const strip = this.thumbnailStripRef()?.nativeElement;
      if (!strip) return;
      const activeThumb = strip.querySelector(
        `[data-thumb-index="${this.activeIndex()}"]`,
      ) as HTMLElement | null;
      if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }, 30);
  }
}
