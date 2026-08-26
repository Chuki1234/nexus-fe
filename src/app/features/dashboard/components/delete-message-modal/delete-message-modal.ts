import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import type { MessageResponseDto } from '../../../../core/api/messages-api.service';
import type { ChatUiMessage } from '../../services/active-chat.store';

export type DeleteMessageTarget = MessageResponseDto | ChatUiMessage;

@Component({
  selector: 'app-delete-message-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, Avatar],
  templateUrl: './delete-message-modal.html',
  styleUrl: './delete-message-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteMessageModal {
  @ViewChild('modalCard') modalCard?: ElementRef<HTMLDivElement>;

  readonly message = input.required<DeleteMessageTarget>();
  readonly canRecall = input<boolean>(false);
  readonly isSubmitting = input<boolean>(false);

  readonly close = output<void>();
  readonly confirm = output<'for_me' | 'everyone'>();

  protected readonly selectedScope = signal<'for_me' | 'everyone'>('for_me');

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event?: Event): void {
    if (!this.isSubmitting()) {
      event?.preventDefault();
      this.close.emit();
    }
  }

  selectScope(scope: 'for_me' | 'everyone'): void {
    if (this.isSubmitting()) return;
    this.selectedScope.set(scope);
  }

  onConfirm(): void {
    if (this.isSubmitting()) return;
    const scope = this.canRecall() ? this.selectedScope() : 'for_me';
    this.confirm.emit(scope);
  }
}
