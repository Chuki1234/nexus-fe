import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

import { ATTACHMENT_LIMITS } from '../../../../core/constants/attachments.constant';

export type MessageComposerContextKind =
  | 'reply'
  | 'edit'
  | 'forward'
  | 'delete';

export interface MessageComposerContext {
  kind: MessageComposerContextKind;
  icon: string;
  label: string;
  description: string;
  messageId?: string;
  replyToId?: string;
}

export interface PendingAttachmentItem {
  file: File;
  previewUrl: string | null;
}

export interface SendMessagePayload {
  content: string;
  replyToId?: string;
  editMessageId?: string;
  files?: File[];
  attachments?: PendingAttachmentItem[];
}

export interface PendingFileItem {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
  name: string;
  formattedSize: string;
}

export interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Mặt cười & Cảm xúc',
    icon: 'sentiment_satisfied',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵',
      '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕',
      '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
      '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
      '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
    ],
  },
  {
    name: 'Cử chỉ & Con người',
    icon: 'pan_tool',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
      '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
      '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩',
    ],
  },
  {
    name: 'Động vật & Thiên nhiên',
    icon: 'pets',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
      '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
      '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
      '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
      '🐬', '🐳', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘',
    ],
  },
  {
    name: 'Đồ ăn & Thức uống',
    icon: 'restaurant',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦',
      '🌽', '🌶️', '🥒', '🥬', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐',
      '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓',
      '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙',
      '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛',
      '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠',
      '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮',
      '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛',
      '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷',
    ],
  },
  {
    name: 'Biểu tượng & Trái tim',
    icon: 'favorite',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
      '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
      '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
      '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🛑', '✨', '⭐', '🌟',
      '💫', '💥', '🔥', '⚡', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️',
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🎯', '💯',
    ],
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Ô soạn tin nhắn ở đáy khu nội dung.
 *
 * Hỗ trợ Textarea auto-resize, Enter để gửi, Shift+Enter để xuống dòng,
 * đính kèm file/ảnh (Drag-drop, Paste, Picker), Emoji Picker Unicode thật.
 */
@Component({
  selector: 'app-message-composer',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block shrink-0 px-4 pb-6',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.css',
})
export class MessageComposer implements OnDestroy {
  readonly textareaEl =
    viewChild<ElementRef<HTMLTextAreaElement>>('messageTextarea');
  readonly fileInputEl =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Tên kênh hoặc người nhận, hiện trong placeholder. */
  readonly target = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly attachmentsDisabled = input<boolean>(false);
  readonly attachmentsDisabledReason = input<string>('Đính kèm tệp đã bị vô hiệu hóa');
  readonly context = input<MessageComposerContext | null>(null);

  readonly send = output<SendMessagePayload>();
  readonly typing = output<void>();
  readonly stoppedTyping = output<void>();
  readonly contextClosed = output<void>();

  readonly text = signal<string>('');
  readonly pendingFiles = signal<PendingFileItem[]>([]);
  readonly isDraggingOver = signal<boolean>(false);
  readonly showEmojiPicker = signal<boolean>(false);
  readonly activeEmojiCategoryIndex = signal<number>(0);
  readonly fileErrorMessage = signal<string | null>(null);
  dragEnterCounter = 0;

  protected readonly emojiCategories = EMOJI_CATEGORIES;

  constructor() {
    effect(() => {
      const ctx = this.context();
      if (ctx) {
        untracked(() => {
          if (ctx.kind === 'edit') {
            this.revokePendingUrls();
            this.pendingFiles.set([]);
            this.fileErrorMessage.set(null);
            this.text.set(ctx.description || '');
          }
          // Tự động focus ngay vào ô nhập liệu khi chọn Trả lời / Chỉnh sửa / Chuyển tiếp
          setTimeout(() => {
            const textarea = this.textareaEl()?.nativeElement;
            if (textarea) {
              textarea.focus();
              if (ctx.kind === 'edit') {
                const len = textarea.value.length;
                textarea.setSelectionRange(len, len);
              }
            }
          }, 0);
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.revokePendingUrls();
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      this.showEmojiPicker() &&
      !target.closest('.composer-emoji-palette') &&
      !target.closest('.emoji-toggle-btn')
    ) {
      this.showEmojiPicker.set(false);
    }
  }

  onEscape(): void {
    if (this.showEmojiPicker()) {
      this.showEmojiPicker.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (event.isComposing) return;
      event.preventDefault();
      this.submit();
    }
  }

  onInput(value: string): void {
    this.text.set(value);
    this.adjustTextareaHeight();
    if (value.trim().length > 0) {
      this.typing.emit();
    } else {
      this.stoppedTyping.emit();
    }
  }

  onBlur(): void {
    this.stoppedTyping.emit();
  }

  openFileDialog(): void {
    if (this.disabled() || this.context()?.kind === 'edit') return;
    const fileInput = this.fileInputEl()?.nativeElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: Event): void {
    if (this.context()?.kind === 'edit') return;
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled() && this.context()?.kind !== 'edit') {
      this.dragEnterCounter++;
      this.isDraggingOver.set(true);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled() && this.context()?.kind !== 'edit') {
      this.isDraggingOver.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragEnterCounter--;
    if (this.dragEnterCounter <= 0) {
      this.dragEnterCounter = 0;
      this.isDraggingOver.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragEnterCounter = 0;
    this.isDraggingOver.set(false);

    if (this.disabled() || this.context()?.kind === 'edit') return;

    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onPaste(event: ClipboardEvent): void {
    if (this.disabled() || this.context()?.kind === 'edit') return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const filesToPaste: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          filesToPaste.push(file);
        }
      }
    }

    if (filesToPaste.length > 0) {
      event.preventDefault();
      this.addFiles(filesToPaste);
    }
  }

  addFiles(files: File[]): void {
    if (this.context()?.kind === 'edit') return;
    this.fileErrorMessage.set(null);
    const current = this.pendingFiles();

    if (current.length + files.length > ATTACHMENT_LIMITS.MAX_FILES_PER_MESSAGE) {
      this.fileErrorMessage.set(
        `Chỉ được gửi tối đa ${ATTACHMENT_LIMITS.MAX_FILES_PER_MESSAGE} file cùng lúc.`,
      );
      return;
    }

    const currentTotalBytes = current.reduce((sum, item) => sum + item.file.size, 0);
    let runningBatchBytes = 0;
    const validNewItems: PendingFileItem[] = [];
    const allowedMimes = ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES as readonly string[];

    for (const f of files) {
      if (f.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE_BYTES) {
        this.fileErrorMessage.set(
          `File "${f.name}" (${formatFileSize(f.size)}) vượt quá giới hạn 10MB.`,
        );
        continue;
      }

      const isAllowedMime =
        allowedMimes.includes(f.type) ||
        (f.type === '' && (f.name.endsWith('.zip') || f.name.endsWith('.txt')));

      if (!isAllowedMime) {
        this.fileErrorMessage.set(
          `Định dạng file "${f.name}" không được hỗ trợ.`,
        );
        continue;
      }

      if (
        currentTotalBytes + runningBatchBytes + f.size >
        ATTACHMENT_LIMITS.MAX_TOTAL_SIZE_BYTES
      ) {
        this.fileErrorMessage.set(
          `Tổng dung lượng tệp đính kèm vượt quá giới hạn 30MB.`,
        );
        continue;
      }

      runningBatchBytes += f.size;
      const isImage = f.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(f) : null;

      validNewItems.push({
        id: crypto.randomUUID(),
        file: f,
        previewUrl,
        isImage,
        name: f.name,
        formattedSize: formatFileSize(f.size),
      });
    }

    if (validNewItems.length > 0) {
      this.pendingFiles.set([...current, ...validNewItems]);
    }
  }

  removeFile(id: string): void {
    const list = this.pendingFiles();
    const item = list.find((p) => p.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    this.pendingFiles.set(list.filter((p) => p.id !== id));
  }

  toggleEmojiPicker(): void {
    if (this.disabled()) return;
    this.showEmojiPicker.update((v) => !v);
  }

  selectEmojiCategory(index: number): void {
    this.activeEmojiCategoryIndex.set(index);
  }

  insertEmoji(emoji: string): void {
    const textarea = this.textareaEl()?.nativeElement;
    if (!textarea) {
      this.text.update((t) => t + emoji);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const current = this.text();
    const updated = current.slice(0, start) + emoji + current.slice(end);
    this.text.set(updated);

    // Đưa con trỏ đến ngay sau emoji vừa chèn
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + emoji.length;
      textarea.setSelectionRange(nextPos, nextPos);
      this.adjustTextareaHeight();
    }, 0);

    this.typing.emit();
  }

  adjustTextareaHeight(): void {
    const textarea = this.textareaEl()?.nativeElement;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const maxAllowedHeight = isMobile
      ? Math.min(160, Math.floor(window.innerHeight * 0.32))
      : 200;

    const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), maxAllowedHeight);
    textarea.style.height = `${newHeight}px`;
  }

  private revokePendingUrls(): void {
    for (const item of this.pendingFiles()) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }

  submit(): void {
    const raw = this.text();
    const trimmed = raw.trim();
    const currentContext = this.context();
    const isEditMode = currentContext?.kind === 'edit';

    if (isEditMode) {
      this.revokePendingUrls();
      this.pendingFiles.set([]);
    }

    const pending = isEditMode ? [] : this.pendingFiles();
    const files = pending.map((p) => p.file);

    if ((!trimmed && files.length === 0) || this.disabled()) {
      return;
    }

    const payload: SendMessagePayload = {
      content: trimmed,
      files: !isEditMode && files.length > 0 ? files : undefined,
      attachments:
        !isEditMode && pending.length > 0
          ? pending.map((p) => ({ file: p.file, previewUrl: p.previewUrl }))
          : undefined,
      replyToId:
        currentContext?.kind === 'reply'
          ? currentContext.replyToId
          : undefined,
      editMessageId:
        isEditMode
          ? currentContext.messageId
          : undefined,
    };

    this.send.emit(payload);

    // Reset trạng thái composer
    this.text.set('');
    this.pendingFiles.set([]);
    this.fileErrorMessage.set(null);
    this.showEmojiPicker.set(false);
    this.stoppedTyping.emit();

    const textarea = this.textareaEl()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    if (currentContext) {
      this.contextClosed.emit();
    }
  }
}
