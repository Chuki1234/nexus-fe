import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PRESENCE_LABEL, type PresenceStatus } from '../../../shared/dto/common';

/** Màu theo trạng thái. Xanh brand chỉ dành cho "đang trực tuyến" — đúng luật
 *  "primary chỉ cho CTA và chỉ báo trạng thái sống" trong DESIGN-voltagent.md. */
const FILL: Record<PresenceStatus, string> = {
  online: 'bg-primary',
  idle: 'bg-mute',
  dnd: 'bg-danger',
  offline: 'bg-hairline-strong',
};

const SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'size-2.5',
  md: 'size-3',
  lg: 'size-4',
};

/**
 * Chấm trạng thái.
 *
 * `ring` là màu nền của chỗ đặt chấm — cần có để chấm tách khỏi avatar phía sau.
 * Truyền đúng bề mặt chứa nó, nếu không viền sẽ hiện sai màu ở cột có nền khác.
 */
@Component({
  selector: 'app-status-dot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  templateUrl: './status-dot.html',
  styleUrl: './status-dot.css',
})
export class StatusDot {
  readonly presence = input.required<PresenceStatus>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Nền bao quanh chấm. 'none' khi chấm đứng riêng, không đè lên gì. */
  readonly ring = input<'canvas' | 'canvas-soft' | 'none'>('none');

  protected readonly label = computed(() => PRESENCE_LABEL[this.presence()]);

  protected readonly classes = computed(() => {
    const ring = this.ring();
    const border =
      ring === 'none'
        ? ''
        : `border-2 ${ring === 'canvas' ? 'border-canvas' : 'border-canvas-soft'}`;
    return `block rounded-full ${SIZE[this.size()]} ${FILL[this.presence()]} ${border}`;
  });
}
