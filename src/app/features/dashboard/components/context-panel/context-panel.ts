import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  DashboardLayoutService,
  MEMBER_DEFAULT_WIDTH,
  MEMBER_MAX_WIDTH,
  MEMBER_MIN_WIDTH,
} from '../../../../layouts/app-layout/services/dashboard-layout.service';

@Component({
  selector: 'app-context-panel',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './context-panel.html',
  styleUrl: './context-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'contents',
    '(document:keydown.escape)': 'closeFromKeyboard($event)',
  },
})
export class ContextPanel {
  protected readonly layoutService = inject(DashboardLayoutService);

  readonly title = input.required<string>();
  readonly open = input<boolean>(false);
  readonly pinned = input<boolean>(false);
  readonly showClose = input<boolean>(true);
  /**
   * Ẩn hẳn thanh tiêu đề (tên + nút đóng) để nội dung tràn lên sát mép trên.
   * Dùng cho panel hồ sơ — nó tự có ảnh bìa + tên nên thanh "Hồ sơ" phía trên
   * chỉ lặp lại thừa. `title` vẫn giữ cho `aria-label` của vùng.
   */
  readonly hideHeader = input<boolean>(false);

  readonly closed = output<void>();

  constructor() {
    effect(() => {
      this.layoutService.setIsMemberOpen(this.open());
    });
  }

  protected readonly memberMinWidth = MEMBER_MIN_WIDTH;
  protected readonly memberMaxWidth = MEMBER_MAX_WIDTH;
  protected readonly memberDefaultWidth = MEMBER_DEFAULT_WIDTH;

  startMemberResize(event: PointerEvent): void {
    if (!this.open()) return;
    event.preventDefault();

    const target = event.currentTarget as HTMLElement;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {}
    }

    this.layoutService.isDraggingMember.set(true);
    const startX = event.clientX;
    const startWidth = this.layoutService.memberWidth();

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      // Right panel: dragging left increases width, dragging right decreases width
      const delta = startX - moveEvent.clientX;
      this.layoutService.setMemberWidth(startWidth + delta);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (target && typeof target.releasePointerCapture === 'function') {
        try {
          target.releasePointerCapture(upEvent.pointerId);
        } catch {}
      }

      this.layoutService.isDraggingMember.set(false);
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }

      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
      this.layoutService.savePreferences();
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
  }

  resetMemberWidth(): void {
    this.layoutService.resetMemberWidth();
  }

  handleMemberKeyDown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 32 : 8;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      // ArrowLeft expands member pane
      this.layoutService.adjustMemberWidth(step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      // ArrowRight shrinks member pane
      this.layoutService.adjustMemberWidth(-step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.layoutService.setMemberWidth(MEMBER_MIN_WIDTH);
      this.layoutService.savePreferences();
    } else if (event.key === 'End') {
      event.preventDefault();
      this.layoutService.setMemberWidth(MEMBER_MAX_WIDTH);
      this.layoutService.savePreferences();
    }
  }

  protected requestClose(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected closeFromKeyboard(event: Event): void {
    if (!this.open() || !this.showClose()) {
      return;
    }

    event.preventDefault();
    this.closed.emit();
  }
}
