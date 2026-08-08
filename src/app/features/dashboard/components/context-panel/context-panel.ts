import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-context-panel',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './context-panel.html',
  styleUrl: './context-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ContextPanel {
  readonly title = input.required<string>();
  readonly open = input<boolean>(false);
  readonly pinned = input<boolean>(false);

  readonly closed = output<void>();

  protected requestClose(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected closeFromKeyboard(event: Event): void {
    if (!this.open()) {
      return;
    }

    event.preventDefault();
    this.closed.emit();
  }
}
