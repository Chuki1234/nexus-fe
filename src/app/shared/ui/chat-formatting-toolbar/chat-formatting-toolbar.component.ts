import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownFormatType } from '../../../core/utils/markdown-editing.util';

export interface FormattingToolbarPosition {
  top: number;
  left: number;
}

@Component({
  selector: 'app-chat-formatting-toolbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './chat-formatting-toolbar.component.html',
  styleUrl: './chat-formatting-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.top.px]': 'position?.top ?? 0',
    '[style.left.px]': 'position?.left ?? 0',
    class: 'fixed z-50 transition-all duration-150 ease-out select-none',
  },
})
export class ChatFormattingToolbarComponent {
  @Input() position: FormattingToolbarPosition | null = null;
  @Output() formatSelected = new EventEmitter<MarkdownFormatType>();

  onFormat(type: MarkdownFormatType, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.formatSelected.emit(type);
  }
}
