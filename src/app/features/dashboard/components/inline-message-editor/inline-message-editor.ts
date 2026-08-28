import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
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
import { ATTACHMENT_LIMITS } from '../../../../core/constants/attachments.constant';
import {
  extractClipboardMessage,
  insertTextAtSelection,
} from '../../../../core/utils/message-clipboard.util';
import {
  applyMarkdownFormat,
  handleMarkdownHotkeys,
  type MarkdownFormatType,
} from '../../../../core/utils/markdown-editing.util';
import { deleteMentionTokenAtomically } from '../../../../core/utils/mention-token-edit.util';

export interface InlineMessageEditPayload {
  content: string;
  files: File[];
}

interface InlinePendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

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
export class InlineMessageEditor implements OnInit, OnDestroy {
  readonly messageId = input.required<string>();
  readonly initialContent = input.required<string>();
  readonly createdAt = input.required<string>();
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly expired = input<boolean>(false);
  readonly existingAttachmentCount = input<number>(0);

  readonly save = output<InlineMessageEditPayload>();
  readonly cancel = output<void>();

  readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('editorTextarea');
  readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('editorFileInput');

  /**
   * Bản nháp cục bộ của editor. Khởi tạo 1 lần duy nhất từ `initialContent` khi mở.
   * Không dùng effect để tránh remote update ghi đè nội dung người dùng đang gõ.
   */
  readonly draft = signal<string>('');
  readonly pendingFiles = signal<InlinePendingFile[]>([]);
  readonly fileError = signal<string | null>(null);
  readonly showFormatToolbar = signal<boolean>(false);

  readonly isEmpty = computed(
    () =>
      this.draft().trim().length === 0 &&
      this.pendingFiles().length === 0 &&
      this.existingAttachmentCount() === 0,
  );
  readonly canSubmit = computed(() => !this.isEmpty() && !this.saving() && !this.expired());

  toggleFormatToolbar(): void {
    this.showFormatToolbar.update((v) => !v);
  }

  applyFormat(format: MarkdownFormatType): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;
    const res = applyMarkdownFormat(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
    );
    textarea.value = res.value;
    this.draft.set(res.value);
    this.adjustHeight(textarea);
    queueMicrotask(() => {
      textarea.setSelectionRange(res.selectionStart, res.selectionEnd);
      textarea.focus();
    });
  }

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

  ngOnDestroy(): void {
    this.pendingFiles().forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.draft.set(target.value);
    this.adjustHeight(target);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      (event.key === 'Backspace' || event.key === 'Delete') &&
      this.deleteMentionAtCaret(event.key)
    ) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
      return;
    }

    // Bắt phím tắt Markdown
    const textarea = this.textareaRef()?.nativeElement;
    if (
      textarea &&
      handleMarkdownHotkeys(event, textarea, (res) => {
        textarea.value = res.value;
        this.draft.set(res.value);
        this.adjustHeight(textarea);
        queueMicrotask(() => {
          textarea.setSelectionRange(res.selectionStart, res.selectionEnd);
          textarea.focus();
        });
      })
    ) {
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitSave();
    }
  }

  private deleteMentionAtCaret(key: 'Backspace' | 'Delete'): boolean {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return false;
    const result = deleteMentionTokenAtomically(
      textarea.value,
      textarea.selectionStart ?? 0,
      textarea.selectionEnd ?? textarea.selectionStart ?? 0,
      key,
    );
    if (!result) return false;

    textarea.value = result.value;
    this.draft.set(result.value);
    textarea.setSelectionRange(result.caret, result.caret);
    this.adjustHeight(textarea);
    return true;
  }

  protected async onPaste(event: ClipboardEvent): Promise<void> {
    const clipboard = event.clipboardData;
    if (!clipboard || this.saving() || this.expired()) return;

    const containsFile =
      clipboard.files.length > 0 ||
      Array.from(clipboard.items || []).some((item) => item.kind === 'file');
    const containsRichHtml = (clipboard.getData('text/html') || '').trim().length > 0;
    const rawPlain = clipboard.getData('text/plain') || '';
    const containsExternalTokens = /<@&?\d+>|<#\d+>|<t:\d+>/.test(rawPlain);

    if (!containsFile && !containsRichHtml && !containsExternalTokens) return;

    event.preventDefault();
    const textarea = this.textareaRef()?.nativeElement;
    const current = textarea?.value ?? this.draft();
    const start = textarea?.selectionStart ?? current.length;
    const end = textarea?.selectionEnd ?? start;
    const payload = await extractClipboardMessage(clipboard);

    if (payload.text) {
      const inserted = insertTextAtSelection(current, payload.text, start, end);
      this.draft.set(inserted.value);
      if (textarea) {
        textarea.value = inserted.value;
        this.adjustHeight(textarea);
      }
      queueMicrotask(() => textarea?.setSelectionRange(inserted.caret, inserted.caret));
    }

    this.addFiles(payload.files);
    if (payload.failedResourceCount > 0) {
      this.fileError.set(
        `${payload.failedResourceCount} tệp trong nội dung sao chép bị nguồn bên ngoài chặn tải (CORS/bảo mật). Hãy tải tệp xuống rồi đính kèm trực tiếp.`,
      );
    }
  }

  protected openFileDialog(): void {
    if (this.saving() || this.expired()) return;
    this.fileInputRef()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files || []));
    input.value = '';
  }

  protected removeFile(id: string): void {
    const target = this.pendingFiles().find((item) => item.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    this.pendingFiles.update((items) => items.filter((item) => item.id !== id));
  }

  private addFiles(files: File[]): void {
    if (files.length === 0) return;
    this.fileError.set(null);
    const current = this.pendingFiles();
    const availableSlots =
      ATTACHMENT_LIMITS.MAX_FILES_PER_MESSAGE - this.existingAttachmentCount() - current.length;
    if (files.length > availableSlots) {
      this.fileError.set(
        `Tin nhắn chỉ được có tối đa ${ATTACHMENT_LIMITS.MAX_FILES_PER_MESSAGE} tệp đính kèm.`,
      );
      return;
    }

    const currentBytes = current.reduce((sum, item) => sum + item.file.size, 0);
    let addedBytes = 0;
    const allowedMimes = ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES as readonly string[];
    const accepted: InlinePendingFile[] = [];

    for (const file of files) {
      if (file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE_BYTES) {
        this.fileError.set(`Tệp "${file.name}" vượt quá giới hạn 10MB.`);
        continue;
      }
      if (!allowedMimes.includes(file.type)) {
        this.fileError.set(`Định dạng tệp "${file.name}" không được hỗ trợ.`);
        continue;
      }
      if (currentBytes + addedBytes + file.size > ATTACHMENT_LIMITS.MAX_TOTAL_SIZE_BYTES) {
        this.fileError.set('Tổng dung lượng tệp đính kèm vượt quá giới hạn 30MB.');
        continue;
      }
      addedBytes += file.size;
      const isImage = file.type.startsWith('image/');
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
        isImage,
      });
    }

    if (accepted.length > 0) this.pendingFiles.update((items) => [...items, ...accepted]);
  }

  protected submitSave(): void {
    if (!this.canSubmit()) return;
    const text = this.draft().trim();
    this.save.emit({
      content: text,
      files: this.pendingFiles().map((item) => item.file),
    });
  }

  private adjustHeight(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }
}
