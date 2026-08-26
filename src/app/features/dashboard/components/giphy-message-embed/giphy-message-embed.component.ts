import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, signal } from '@angular/core';
import { GiphyMediaDto } from '../../../../../shared/dto/messages.dto';
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

  @Input({ required: true }) media!: GiphyMediaDto;
  @Input() messageId?: string;

  readonly videoFailed = signal(false);
  readonly imageFailed = signal(false);

  readonly aspectRatioStyle = computed(() => {
    if (!this.media || !this.media.width || !this.media.height) {
      return '4 / 3';
    }
    return `${this.media.width} / ${this.media.height}`;
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

    const url = this.media.displayUrl || this.media.previewUrl || '';
    const filename = this.media.title ? `${this.media.title}.gif` : 'giphy.gif';

    this.lightbox.open({
      items: [
        {
          messageId: this.messageId || 'gif-msg',
          attachmentId: this.media.externalId || 'gif-media',
          filename,
          mimeType: 'image/gif',
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
