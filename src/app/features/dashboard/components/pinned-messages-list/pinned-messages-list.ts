import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { MessageResponseDto } from '../../../../core/api/messages-api.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

@Component({
  selector: 'app-pinned-messages-list',
  imports: [Avatar, DatePipe, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pinned-messages-list.html',
  styleUrl: './pinned-messages-list.css',
})
export class PinnedMessagesList {
  readonly messages = input.required<readonly MessageResponseDto[]>();
  readonly busyIds = input<ReadonlySet<string>>(new Set<string>());
  readonly emptyLabel = input('Chưa có tin nhắn nào được ghim trong cuộc trò chuyện này.');

  readonly jump = output<MessageResponseDto>();
  readonly unpin = output<MessageResponseDto>();

  protected excerpt(message: MessageResponseDto): string {
    const content = message.content?.trim();
    if (content) return content;
    if (message.externalMedia) return 'Ảnh GIF';
    const count = message.attachments?.length ?? 0;
    return count > 1 ? `${count} tệp đính kèm` : 'Tệp đính kèm';
  }
}
