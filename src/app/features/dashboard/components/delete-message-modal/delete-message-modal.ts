import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import type { MessageResponseDto } from '../../../../core/api/messages-api.service';
import type { ChatUiMessage } from '../../services/active-chat.store';

export type DeleteMessageTarget = MessageResponseDto | ChatUiMessage;

export interface DeleteMessageModalData {
  message: DeleteMessageTarget;
  canRecall: boolean;
}

@Component({
  selector: 'app-delete-message-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule, Avatar],
  templateUrl: './delete-message-modal.html',
  styleUrl: './delete-message-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteMessageModal {
  @ViewChild('modalCard') modalCard?: ElementRef<HTMLDivElement>;

  private readonly dialogData = inject<DeleteMessageModalData>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialogRef = inject<MatDialogRef<DeleteMessageModal, 'for_me' | 'everyone'>>(MatDialogRef, { optional: true });

  readonly messageInput = input<DeleteMessageTarget | null>(null, { alias: 'message' });
  readonly canRecallInput = input<boolean | null>(null, { alias: 'canRecall' });
  readonly isSubmitting = input<boolean>(false);

  readonly close = output<void>();
  readonly confirm = output<'for_me' | 'everyone'>();

  readonly message = computed<DeleteMessageTarget>(() => {
    return this.dialogData?.message || this.messageInput()!;
  });

  readonly canRecall = computed<boolean>(() => {
    if (this.dialogData) return this.dialogData.canRecall;
    return this.canRecallInput() ?? false;
  });

  protected readonly selectedScope = signal<'for_me' | 'everyone'>('for_me');

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event?: Event): void {
    if (!this.isSubmitting()) {
      event?.preventDefault();
      this.onClose();
    }
  }

  selectScope(scope: 'for_me' | 'everyone'): void {
    if (this.isSubmitting()) return;
    this.selectedScope.set(scope);
  }

  onClose(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.close.emit();
    }
  }

  onConfirm(): void {
    if (this.isSubmitting()) return;
    const scope = this.canRecall() ? this.selectedScope() : 'for_me';
    if (this.dialogRef) {
      this.dialogRef.close(scope);
    } else {
      this.confirm.emit(scope);
    }
  }
}
