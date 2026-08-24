import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { PresenceStatus } from '../../../../shared/dto/common';
import { PresenceService } from '../../../core/presence/presence.service';
import { StatusDot } from '../status-dot/status-dot';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const BOX: Record<AvatarSize, string> = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-10',
  xl: 'size-20',
};

/** Cỡ chữ của chữ cái dự phòng, đi kèm từng cỡ hộp. */
const TEXT: Record<AvatarSize, string> = {
  xs: 'text-caption-bold',
  sm: 'text-caption-bold',
  md: 'text-body-sm-medium',
  lg: 'text-body-sm-medium',
  xl: 'text-heading-3',
};

/** Chấm trạng thái nhỏ hơn ở avatar nhỏ, nếu không nó nuốt mất avatar. */
const DOT: Record<AvatarSize, 'sm' | 'md' | 'lg'> = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'md',
  xl: 'lg',
};

/**
 * Avatar tròn, tự rơi về chữ cái đầu khi không có ảnh.
 *
 * Ảnh hỏng cũng rơi về chữ cái — người dùng đặt `avatar_url` trỏ vào link chết là
 * chuyện thường, để vỡ ảnh sẽ xấu hơn nhiều so với hiện chữ.
 *
 * Không dùng `NgOptimizedImage`: avatar là URL do người dùng nhập, không phải ảnh
 * tĩnh của dự án, nên không qua được image loader.
 */
@Component({
  selector: 'app-avatar',
  imports: [StatusDot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex shrink-0' },
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
  readonly name = input.required<string>();
  readonly userId = input<string | null>(null);
  readonly src = input<string | null>(null);
  readonly size = input<AvatarSize>('md');
  readonly presence = input<PresenceStatus | null>(null);
  /** Nền phía sau — quyết định màu viền của chấm trạng thái. */
  readonly ring = input<'canvas' | 'surface'>('surface');

  private readonly presenceService = inject(PresenceService);

  protected readonly imageFailed = signal(false);

  protected readonly box = computed(() => BOX[this.size()]);
  protected readonly text = computed(() => TEXT[this.size()]);
  protected readonly dotSize = computed(() => DOT[this.size()]);

  protected readonly effectivePresence = computed<PresenceStatus | null>(() => {
    const explicit = this.presence();
    if (explicit !== null && explicit !== undefined) {
      return explicit;
    }
    const uid = this.userId();
    if (uid) {
      return this.presenceService.getPresence(uid)();
    }
    return null;
  });

  protected readonly initials = computed(() => {
    const trimmed = this.name().trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  });

  protected readonly tone = computed(() => {
    const key = this.userId() || this.name();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
    }
    const tones = ['emerald', 'teal', 'slate', 'indigo', 'amber', 'rose'] as const;
    return tones[Math.abs(hash) % tones.length];
  });
}
