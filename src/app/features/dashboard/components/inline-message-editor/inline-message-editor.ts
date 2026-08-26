import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-inline-message-editor',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  templateUrl: './inline-message-editor.html',
  styleUrl: './inline-message-editor.css',
})
export class InlineMessageEditor implements OnInit {
  readonly messageId = input.required<string>();
  readonly initialContent = input.required<string>();
  readonly createdAt = input.required<string>();
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly expired = input<boolean>(false);

  readonly save = output<string>();
  readonly cancel = output<void>();

  readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('editorTextarea');

  /**
   * Bản nháp cục bộ của editor. Khởi tạo 1 lần duy nhất từ `initialContent` khi mở.
   * Không dùng effect để tránh remote update ghi đè nội dung người dùng đang gõ.
   */
  readonly draft = signal<string>('');

  readonly charCount = computed(() => this.draft().length);
  readonly isOverLimit = computed(() => this.draft().length > 4000);
  readonly isEmpty = computed(() => this.draft().trim().length === 0);
  readonly canSubmit = computed(
    () => !this.isEmpty() && !this.isOverLimit() && !this.saving() && !this.expired(),
  );

  constructor() {
    afterNextRender(() => {
      const el = this.textareaRef()?.nativeElement;
      if (el) {
        el.focus();
        // Đưa con trỏ xuống cuối chuỗi
        const len = el.value.length;
        el.setSelectionRange(len, len);
        this.adjustHeight(el);
      }
    });
  }

  ngOnInit(): void {
    this.draft.set(this.initialContent() || '');
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.draft.set(target.value);
    this.adjustHeight(target);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitSave();
    }
  }

  protected submitSave(): void {
    if (!this.canSubmit()) return;
    const text = this.draft().trim();
    if (!text) return;
    this.save.emit(text);
  }

  private adjustHeight(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }
}
