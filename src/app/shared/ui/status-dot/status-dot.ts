import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PRESENCE_LABEL, type PresenceStatus } from '../../../../shared/dto/common';

/** Màu theo trạng thái.
 *  - online: mint/green rõ nhưng không neon chói (#22c55e)
 *  - idle: amber (#f59e0b)
 *  - dnd: coral/red dịu (#ef4444)
 *  - offline: slate/gray (#64748b)
 */
const FILL: Record<PresenceStatus, string> = {
  online: 'bg-[#22c55e]',
  idle: 'bg-[#f59e0b]',
  dnd: 'bg-[#ef4444]',
  offline: 'bg-[#64748b]',
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
  readonly ring = input<'canvas' | 'surface' | 'none'>('none');

  protected readonly label = computed(() => PRESENCE_LABEL[this.presence()]);

  protected readonly classes = computed(() => {
    const ring = this.ring();
    const border =
      ring === 'none' ? '' : `border-2 ${ring === 'canvas' ? 'border-canvas' : 'border-surface'}`;
    return `block rounded-full ${SIZE[this.size()]} ${FILL[this.presence()]} ${border}`;
  });
}
