import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, signal } from '@angular/core';
import { ExternalMediaDto } from '../../../../../shared/dto/messages.dto';
import { LightboxGalleryService } from '../../../../shared/ui/lightbox-gallery/lightbox-gallery.service';

@Component({
  selector: 'app-giphy-message-embed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './giphy-message-embed.component.html',
  styleUrl: './giphy-message-embed.component.scss',
})
export class GiphyMessageEmbedComponent {
  private readonly lightbox = inject(LightboxGalleryService);

  @Input({ required: true }) media!: ExternalMediaDto;
  @Input() messageId?: string;

  readonly videoFailed = signal(false);
  readonly imageFailed = signal(false);

  readonly aspectRatioStyle = computed(() => {
    if (!this.media || !this.media.width || !this.media.height) {
      return '1 / 1';
    }
    return `${this.media.width} / ${this.media.height}`;
  });

  readonly maxWidthPx = computed(() => {
    if (this.media?.mediaType === 'sticker') return 160;
    return this.media?.width && this.media.width > 480 ? 480 : (this.media?.width || 480);
  });

  onVideoError(): void {
    this.videoFailed.set(true);
  }

  onImageError(): void {
    this.imageFailed.set(true);
  }

  openLightbox(event?: Event): void {
    if (!this.media) return;
    event?.stopPropagation();

    const isSticker = this.media.mediaType === 'sticker';
    const url = this.media.displayUrl || this.media.previewUrl || '';
    const ext = isSticker ? 'png' : 'gif';
    const filename = this.media.title ? `${this.media.title}.${ext}` : `media.${ext}`;
    const mimeType = isSticker ? 'image/png' : 'image/gif';

    this.lightbox.open({
      items: [
        {
          messageId: this.messageId || (isSticker ? 'sticker-msg' : 'gif-msg'),
          attachmentId: this.media.externalId || (isSticker ? 'sticker-media' : 'gif-media'),
          filename,
          mimeType,
          url,
          senderName: this.media.creatorUsername ? `@${this.media.creatorUsername}` : undefined,
        },
      ],
      initialIndex: 0,
      openerElement: (event?.target as HTMLElement) || null,
      onDownload: (item) => {
        window.open(item.url, '_blank');
      },
    });
  }
}
