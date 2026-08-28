import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

import { ATTACHMENT_LIMITS } from '../../../../core/constants/attachments.constant';
import { ExternalMediaDto, GiphyMediaDto } from '../../../../../shared/dto/messages.dto';
import { GiphyPickerComponent } from '../giphy-picker/giphy-picker.component';
import { StipopPickerComponent } from '../stipop-picker/stipop-picker.component';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { StipopApiService } from '../../../../core/api/stipop-api.service';
import { UserSettingsService } from '../../../settings/services/user-settings.service';
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
import {
  convertEmoticonsToEmoji,
  findEmojiSuggestions,
  findCuratedStickerSuggestions,
  EmojiSuggestionItem,
  StickerSuggestionItem,
} from './emoticon-utils';

export type MessageComposerContextKind =
  'reply' | 'edit' | 'forward' | 'delete' | 'pin' | 'unpin' | 'copy';

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
  externalMedia?: GiphyMediaDto;
}

export interface PendingFileItem {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
  mediaKind: 'image' | 'audio' | 'video' | 'file';
  canPreviewVideo: boolean;
  name: string;
  formattedSize: string;
}

export interface MentionCandidate {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isEveryone?: boolean;
  role?: string | null;
  description?: string;
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
      '😀',
      '😃',
      '😄',
      '😁',
      '😆',
      '😅',
      '🤣',
      '😂',
      '🙂',
      '🙃',
      '😉',
      '😊',
      '😇',
      '🥰',
      '😍',
      '🤩',
      '😘',
      '😗',
      '😚',
      '😋',
      '😛',
      '😜',
      '🤪',
      '😝',
      '🤑',
      '🤗',
      '🤭',
      '🤫',
      '🤔',
      '🤐',
      '🤨',
      '😐',
      '😑',
      '😶',
      '😏',
      '😒',
      '🙄',
      '😬',
      '🤥',
      '😌',
      '😔',
      '😪',
      '🤤',
      '😴',
      '😷',
      '🤒',
      '🤕',
      '🤢',
      '🤮',
      '🥵',
      '🥶',
      '🥴',
      '😵',
      '🤯',
      '🤠',
      '🥳',
      '😎',
      '🤓',
      '🧐',
      '😕',
      '😟',
      '🙁',
      '😮',
      '😯',
      '😲',
      '😳',
      '🥺',
      '😦',
      '😧',
      '😨',
      '😰',
      '😥',
      '😢',
      '😭',
      '😱',
      '😖',
      '😣',
      '😞',
      '😓',
      '😩',
      '😫',
      '🥱',
      '😤',
      '😡',
      '😠',
      '🤬',
      '😈',
      '👿',
      '💀',
      '☠️',
    ],
  },
  {
    name: 'Cử chỉ & Con người',
    icon: 'pan_tool',
    emojis: [
      '👋',
      '🤚',
      '🖐️',
      '✋',
      '🖖',
      '👌',
      '🤌',
      '🤏',
      '✌️',
      '🤞',
      '🤟',
      '🤘',
      '🤙',
      '👈',
      '👉',
      '👆',
      '🖕',
      '👇',
      '☝️',
      '👍',
      '👎',
      '✊',
      '👊',
      '🤛',
      '🤜',
      '👏',
      '🙌',
      '👐',
      '🤲',
      '🤝',
      '🙏',
      '✍️',
      '💅',
      '🤳',
      '💪',
      '🦾',
      '🦿',
      '🦵',
      '🦶',
      '👂',
      '🦻',
      '👃',
      '🧠',
      '🫀',
      '🫁',
      '🦷',
      '🦴',
      '👀',
      '👁️',
      '👅',
      '👄',
      '👶',
      '🧒',
      '👦',
      '👧',
      '🧑',
      '👱',
      '👨',
      '🧔',
      '👩',
    ],
  },
  {
    name: 'Động vật & Thiên nhiên',
    icon: 'pets',
    emojis: [
      '🐶',
      '🐱',
      '🐭',
      '🐹',
      '🐰',
      '🦊',
      '🐻',
      '🐼',
      '🐨',
      '🐯',
      '🦁',
      '🐮',
      '🐷',
      '🐸',
      '🐵',
      '🐔',
      '🐧',
      '🐦',
      '🐤',
      '🦆',
      '🦅',
      '🦉',
      '🦇',
      '🐺',
      '🐗',
      '🐴',
      '🦄',
      '🐝',
      '🐛',
      '🦋',
      '🐌',
      '🐞',
      '🐜',
      '🦟',
      '🦗',
      '🕷️',
      '🦂',
      '🐢',
      '🐍',
      '🦎',
      '🦖',
      '🦕',
      '🐙',
      '🦑',
      '🦐',
      '🦞',
      '🦀',
      '🐡',
      '🐠',
      '🐟',
      '🐬',
      '🐳',
      '🦈',
      '🐊',
      '🐅',
      '🐆',
      '🦓',
      '🦍',
      '🦧',
      '🐘',
    ],
  },
  {
    name: 'Đồ ăn & Thức uống',
    icon: 'restaurant',
    emojis: [
      '🍏',
      '🍎',
      '🍐',
      '🍊',
      '🍋',
      '🍌',
      '🍉',
      '🍇',
      '🍓',
      '🫐',
      '🍈',
      '🍒',
      '🍑',
      '🥭',
      '🍍',
      '🥥',
      '🥝',
      '🍅',
      '🥑',
      '🥦',
      '🌽',
      '🌶️',
      '🥒',
      '🥬',
      '🥕',
      '🧄',
      '🧅',
      '🥔',
      '🍠',
      '🥐',
      '🍞',
      '🥖',
      '🥨',
      '🧀',
      '🥚',
      '🍳',
      '🧈',
      '🥞',
      '🧇',
      '🥓',
      '🥩',
      '🍗',
      '🍖',
      '🦴',
      '🌭',
      '🍔',
      '🍟',
      '🍕',
      '🥪',
      '🥙',
      '🧆',
      '🌮',
      '🌯',
      '🥗',
      '🥘',
      '🥫',
      '🍝',
      '🍜',
      '🍲',
      '🍛',
      '🍣',
      '🍱',
      '🥟',
      '🦪',
      '🍤',
      '🍙',
      '🍚',
      '🍘',
      '🍥',
      '🥠',
      '🍢',
      '🍡',
      '🍧',
      '🍨',
      '🍦',
      '🥧',
      '🧁',
      '🍰',
      '🎂',
      '🍮',
      '🍭',
      '🍬',
      '🍫',
      '🍿',
      '🍩',
      '🍪',
      '🌰',
      '🥜',
      '🍯',
      '🥛',
      '☕',
      '🍵',
      '🧃',
      '🥤',
      '🧋',
      '🍶',
      '🍺',
      '🍻',
      '🥂',
      '🍷',
    ],
  },
  {
    name: 'Biểu tượng & Trái tim',
    icon: 'favorite',
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '💟',
      '☮️',
      '✝️',
      '☪️',
      '🕉️',
      '☸️',
      '✡️',
      '🔯',
      '🕎',
      '☯️',
      '☦️',
      '🛐',
      '⛎',
      '♈',
      '♉',
      '♊',
      '♋',
      '♌',
      '♍',
      '♎',
      '♏',
      '♐',
      '♑',
      '♒',
      '♓',
      '🆔',
      '⚛️',
      '🉑',
      '☢️',
      '☣️',
      '📴',
      '📳',
      '🈶',
      '🈚',
      '🈸',
      '🈺',
      '🈷️',
      '✴️',
      '🛑',
      '✨',
      '⭐',
      '🌟',
      '💫',
      '💥',
      '🔥',
      '⚡',
      '🌈',
      '☀️',
      '🌤️',
      '⛅',
      '🌥️',
      '☁️',
      '🎉',
      '🎊',
      '🎈',
      '🎁',
      '🏆',
      '🥇',
      '🥈',
      '🥉',
      '🎯',
      '💯',
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
 * đính kèm file/ảnh, Emoji, GIPHY, Stipop, và Mention (@username / @everyone).
 */
@Component({
  selector: 'app-message-composer',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    GiphyPickerComponent,
    StipopPickerComponent,
    Avatar,
  ],
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
  readonly textareaEl = viewChild<ElementRef<HTMLTextAreaElement>>('messageTextarea');
  readonly fileInputEl = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Tên kênh hoặc người nhận, hiện trong placeholder. */
  readonly target = input.required<string>();
  readonly customPlaceholder = input<string | null>(null);
  readonly disabled = input<boolean>(false);
  readonly slowmode = input<number>(0);
  readonly attachmentsDisabled = input<boolean>(false);
  readonly attachmentsDisabledReason = input<string>('Đính kèm tệp đã bị vô hiệu hóa');
  readonly context = input<MessageComposerContext | null>(null);

  protected readonly placeholderText = computed(() => {
    const custom = this.customPlaceholder();
    if (custom) return custom;
    return `Nhắn ${this.target()}`;
  });

  /** Danh sách ứng viên Mention (@username, @everyone) */
  readonly mentionCandidates = input<MentionCandidate[]>([]);
  readonly loadingMentions = input<boolean>(false);

  readonly send = output<SendMessagePayload>();
  readonly typing = output<void>();
  readonly stoppedTyping = output<void>();
  readonly contextClosed = output<void>();

  readonly text = signal<string>('');
  readonly pendingFiles = signal<PendingFileItem[]>([]);
  readonly isDraggingOver = signal<boolean>(false);
  readonly showEmojiPicker = signal<boolean>(false);
  readonly showGiphyPicker = signal<boolean>(false);
  readonly showStipopPicker = signal<boolean>(false);
  readonly showFormatToolbar = signal<boolean>(false);
  readonly cooldownRemaining = signal<number>(0);
  private cooldownInterval: any = null;
  readonly activeEmojiCategoryIndex = signal<number>(0);
  readonly fileErrorMessage = signal<string | null>(null);

  toggleFormatToolbar(): void {
    this.showFormatToolbar.update((v) => !v);
  }

  applyFormat(format: MarkdownFormatType): void {
    const textarea = this.textareaEl()?.nativeElement;
    if (!textarea) return;
    const res = applyMarkdownFormat(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
    );
    textarea.value = res.value;
    this.onInput(res.value);
    queueMicrotask(() => {
      textarea.setSelectionRange(res.selectionStart, res.selectionEnd);
      textarea.focus();
      this.adjustTextareaHeight();
    });
  }

  // Mention State
  readonly showMentionPopup = signal<boolean>(false);
  readonly mentionQuery = signal<string>('');
  readonly mentionTriggerStart = signal<number>(-1);
  readonly selectedMentionIndex = signal<number>(0);

  readonly filteredMentionCandidates = computed(() => {
    const list = this.mentionCandidates();
    const query = this.mentionQuery().trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((c) => {
      const matchUsername = c.username.toLowerCase().includes(query);
      const matchDisplayName = c.displayName.toLowerCase().includes(query);
      return matchUsername || matchDisplayName;
    });
  });

  protected readonly userSettings = inject(UserSettingsService);
  private readonly stipopApi = inject(StipopApiService, { optional: true });

  // Emoji / Sticker Autocomplete State (gõ vui, :vui, buon, game...)
  readonly showEmojiSuggestPopup = signal<boolean>(false);
  readonly emojiSuggestQuery = signal<string>('');
  readonly emojiSuggestTriggerStart = signal<number>(-1);
  readonly selectedEmojiSuggestIndex = signal<number>(0);
  readonly suggestActiveTab = signal<'all' | 'emoji' | 'sticker'>('all');
  readonly liveStickers = signal<ExternalMediaDto[]>([]);

  readonly filteredEmojiSuggestions = computed(() => {
    return findEmojiSuggestions(this.emojiSuggestQuery());
  });

  readonly filteredStickerSuggestions = computed(() => {
    const query = this.emojiSuggestQuery();
    const curated = findCuratedStickerSuggestions(query).map((c) => c.sticker);
    const live = this.liveStickers();
    const set = new Set<string>();
    const result: ExternalMediaDto[] = [];
    for (const item of [...curated, ...live]) {
      if (!set.has(item.displayUrl)) {
        set.add(item.displayUrl);
        result.push(item);
      }
    }
    return result.slice(0, 8);
  });

  dragEnterCounter = 0;

  /** Safari/macOS có thể báo isComposing=false ở keydown rồi phát input cũ sau send. */
  private isImeComposing = false;
  private suppressedPostSubmitValue: string | null = null;
  private postSubmitResetGeneration = 0;
  private postSubmitSuppressionTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly emojiCategories = EMOJI_CATEGORIES;

  constructor() {
    effect(() => {
      const ctx = this.context();
      if (ctx) {
        untracked(() => {
          this.closeMentionPopup();
          if (ctx.kind === 'edit') {
            this.revokePendingUrls();
            this.pendingFiles.set([]);
            this.fileErrorMessage.set(null);
            this.text.set(ctx.description || '');
            this.showGiphyPicker.set(false);
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
    this.clearCooldown();
    this.revokePendingUrls();
    this.closeMentionPopup();
    if (this.postSubmitSuppressionTimer) {
      clearTimeout(this.postSubmitSuppressionTimer);
    }
  }

  startCooldown(seconds: number): void {
    if (seconds <= 0) return;
    this.clearCooldown();
    this.cooldownRemaining.set(seconds);
    this.cooldownInterval = setInterval(() => {
      const current = this.cooldownRemaining();
      if (current <= 1) {
        this.clearCooldown();
      } else {
        this.cooldownRemaining.set(current - 1);
      }
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.cooldownRemaining.set(0);
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
    if (
      this.showGiphyPicker() &&
      !target.closest('.giphy-picker-container') &&
      !target.closest('.gif-toggle-btn')
    ) {
      this.showGiphyPicker.set(false);
    }
    if (
      this.showStipopPicker() &&
      !target.closest('.stipop-picker-container') &&
      !target.closest('.sticker-toggle-btn')
    ) {
      this.showStipopPicker.set(false);
    }
    if (
      this.showMentionPopup() &&
      !target.closest('.composer-mention-palette') &&
      !target.closest('.mention-toggle-btn')
    ) {
      this.closeMentionPopup();
    }
    if (this.showEmojiSuggestPopup() && !target.closest('.composer-emoji-suggest-palette')) {
      this.closeEmojiSuggestPopup();
    }
  }

  onEscape(): void {
    if (this.showEmojiSuggestPopup()) {
      this.closeEmojiSuggestPopup();
      return;
    }
    if (this.showMentionPopup()) {
      this.closeMentionPopup();
      return;
    }
    if (this.showEmojiPicker()) {
      this.showEmojiPicker.set(false);
    }
    if (this.showGiphyPicker()) {
      this.showGiphyPicker.set(false);
    }
    if (this.showStipopPicker()) {
      this.showStipopPicker.set(false);
    }
  }

  openMentionPopup(): void {
    this.showEmojiPicker.set(false);
    this.showGiphyPicker.set(false);
    this.showStipopPicker.set(false);
    this.showMentionPopup.set(true);
  }

  closeMentionPopup(): void {
    this.showMentionPopup.set(false);
    this.mentionQuery.set('');
    this.mentionTriggerStart.set(-1);
    this.selectedMentionIndex.set(0);
  }

  triggerMentionFromButton(): void {
    if (this.disabled() || this.context()?.kind === 'edit') return;
    this.showEmojiPicker.set(false);
    this.showGiphyPicker.set(false);
    this.showStipopPicker.set(false);

    const textarea = this.textareaEl()?.nativeElement;
    if (!textarea) return;

    textarea.focus();
    const caret = textarea.selectionStart ?? this.text().length;
    const currentText = this.text();
    const before = currentText.slice(0, caret);
    const after = currentText.slice(caret);

    const needsSpaceBefore = before.length > 0 && !/[\s(\[{<"']$/.test(before);
    const insertString = needsSpaceBefore ? ' @' : '@';
    const newText = before + insertString + after;
    const newCaret = caret + insertString.length;

    this.text.set(newText);
    textarea.value = newText;
    textarea.setSelectionRange(newCaret, newCaret);

    this.mentionTriggerStart.set(newCaret - 1);
    this.mentionQuery.set('');
    this.selectedMentionIndex.set(0);
    this.openMentionPopup();
    this.typing.emit();
    this.adjustTextareaHeight();
  }

  checkMentionTrigger(): void {
    const textarea = this.textareaEl()?.nativeElement;
    if (!textarea) return;
    const caret = textarea.selectionStart ?? 0;
    const fullText = textarea.value;
    const textBeforeCaret = fullText.slice(0, caret);

    // Tìm ký tự @ gần nhất trước caret
    const match = textBeforeCaret.match(/(?:^|[\s(\[{<"'])@([a-zA-Z0-9_.]{0,32})$/);
    if (match) {
      const query = match[1];
      const atPos = textBeforeCaret.lastIndexOf('@' + query);
      this.mentionTriggerStart.set(atPos);
      this.mentionQuery.set(query);
      this.selectedMentionIndex.set(0);
      this.openMentionPopup();
    } else {
      if (this.showMentionPopup()) {
        this.closeMentionPopup();
      }
    }
  }

  selectMentionCandidate(candidate: MentionCandidate): void {
    const textarea = this.textareaEl()?.nativeElement;
    const currentText = this.text();
    const atPos = this.mentionTriggerStart();
    const caret = textarea?.selectionStart ?? currentText.length;

    if (atPos >= 0 && atPos <= currentText.length) {
      const beforeAt = currentText.slice(0, atPos);
      const afterQuery = currentText.slice(caret);
      const replacement = `@${candidate.username} `;
      const newText = beforeAt + replacement + afterQuery;
      const newCaret = beforeAt.length + replacement.length;

      this.text.set(newText);
      if (textarea) {
        textarea.value = newText;
        textarea.setSelectionRange(newCaret, newCaret);
        textarea.focus();
      }
    } else {
      const replacement = `@${candidate.username} `;
      const newText = currentText + replacement;
      this.text.set(newText);
      if (textarea) {
        textarea.value = newText;
        textarea.setSelectionRange(newText.length, newText.length);
        textarea.focus();
      }
    }

    this.closeMentionPopup();
    this.adjustTextareaHeight();
    this.typing.emit();
  }

  checkEmojiSuggestTrigger(): void {
    if (!this.userSettings.preferences().suggestStickers) {
      if (this.showEmojiSuggestPopup()) {
        this.closeEmojiSuggestPopup();
      }
      return;
    }

    const textarea = this.textareaEl()?.nativeElement;
    if (!textarea) return;
    const caret = textarea.selectionStart ?? 0;
    const fullText = textarea.value;
    const textBeforeCaret = fullText.slice(0, caret);

    let query: string | null = null;
    let triggerPos = -1;

    // 1. Trường hợp có gõ dấu : ở đầu từ khóa (ví dụ :vui, :buon, :game)
    const colonMatch = textBeforeCaret.match(/(?:^|\s):([a-zA-Z0-9_\u00C0-\u1EF9]{1,16})$/);
    if (colonMatch) {
      query = colonMatch[1];
      triggerPos = textBeforeCaret.length - (query.length + 1);
    } else {
      // 2. Không cần dấu hai chấm : (người dùng gõ trực tiếp như vui, buồn, game, cười, yêu, tim...)
      const plainMatch = textBeforeCaret.match(/(?:^|\s)([a-zA-Z0-9_\u00C0-\u1EF9]{2,16})$/);
      if (plainMatch) {
        query = plainMatch[1];
        triggerPos = textBeforeCaret.length - query.length;
      }
    }

    if (query && triggerPos >= 0) {
      const emojiMatches = findEmojiSuggestions(query);
      const stickerMatches = findCuratedStickerSuggestions(query);

      if (emojiMatches.length > 0 || stickerMatches.length > 0) {
        this.emojiSuggestTriggerStart.set(triggerPos);
        this.emojiSuggestQuery.set(query);
        this.selectedEmojiSuggestIndex.set(0);
        this.showEmojiSuggestPopup.set(true);
        if (this.showMentionPopup()) {
          this.closeMentionPopup();
        }

        // Tải thêm live stickers từ Stipop API
        if (query.length >= 2 && this.stipopApi) {
          const currentQ = query;
          this.stipopApi.searchStickers(currentQ, 1, 10).subscribe({
            next: (items) => {
              if (Array.isArray(items) && this.emojiSuggestQuery() === currentQ) {
                this.liveStickers.set(items);
              }
            },
            error: () => {},
          });
        }
        return;
      }
    }

    if (this.showEmojiSuggestPopup()) {
      this.closeEmojiSuggestPopup();
    }
  }

  closeEmojiSuggestPopup(): void {
    this.showEmojiSuggestPopup.set(false);
    this.emojiSuggestQuery.set('');
    this.emojiSuggestTriggerStart.set(-1);
    this.selectedEmojiSuggestIndex.set(0);
    this.suggestActiveTab.set('all');
    this.liveStickers.set([]);
  }

  onSelectStickerFromSuggest(sticker: ExternalMediaDto): void {
    const textarea = this.textareaEl()?.nativeElement;
    const currentText = this.text();
    const triggerPos = this.emojiSuggestTriggerStart();
    const caret = textarea?.selectionStart ?? currentText.length;

    if (triggerPos >= 0 && triggerPos <= currentText.length) {
      const beforeTrigger = currentText.slice(0, triggerPos);
      const afterQuery = currentText.slice(caret);
      const newText = (beforeTrigger + afterQuery).trim();
      this.text.set(newText);
      if (textarea) {
        textarea.value = newText;
      }
    }

    this.closeEmojiSuggestPopup();
    this.onStickerSelected(sticker);
  }

  selectEmojiSuggestion(item: EmojiSuggestionItem): void {
    const textarea = this.textareaEl()?.nativeElement;
    const currentText = this.text();
    const triggerPos = this.emojiSuggestTriggerStart();
    const caret = textarea?.selectionStart ?? currentText.length;

    if (triggerPos >= 0 && triggerPos <= currentText.length) {
      const beforeTrigger = currentText.slice(0, triggerPos);
      const afterQuery = currentText.slice(caret);
      const replacement = `${item.emoji} `;
      const newText = beforeTrigger + replacement + afterQuery;
      const newCaret = beforeTrigger.length + replacement.length;

      this.text.set(newText);
      if (textarea) {
        textarea.value = newText;
        textarea.setSelectionRange(newCaret, newCaret);
        textarea.focus();
      }
    } else {
      this.insertEmoji(item.emoji);
    }

    this.closeEmojiSuggestPopup();
    this.adjustTextareaHeight();
    this.typing.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    // Intercept keyboard events khi Emoji Suggestion Popup đang mở
    if (this.showEmojiSuggestPopup()) {
      const suggestions = this.filteredEmojiSuggestions();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (suggestions.length > 0) {
          this.selectedEmojiSuggestIndex.update((i) => (i + 1) % suggestions.length);
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (suggestions.length > 0) {
          this.selectedEmojiSuggestIndex.update(
            (i) => (i - 1 + suggestions.length) % suggestions.length,
          );
        }
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        if (!event.shiftKey && !this.isCompositionEvent(event)) {
          event.preventDefault();
          if (suggestions.length > 0) {
            const selected = suggestions[this.selectedEmojiSuggestIndex()] || suggestions[0];
            this.selectEmojiSuggestion(selected);
          } else {
            this.closeEmojiSuggestPopup();
          }
          return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeEmojiSuggestPopup();
        return;
      }
    }
    // Intercept keyboard events khi Mention Popup đang mở
    if (this.showMentionPopup()) {
      const candidates = this.filteredMentionCandidates();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (candidates.length > 0) {
          this.selectedMentionIndex.update((i) => (i + 1) % candidates.length);
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (candidates.length > 0) {
          this.selectedMentionIndex.update((i) => (i - 1 + candidates.length) % candidates.length);
        }
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        if (!event.shiftKey && !this.isCompositionEvent(event)) {
          event.preventDefault();
          if (candidates.length > 0) {
            const selected = candidates[this.selectedMentionIndex()] || candidates[0];
            this.selectMentionCandidate(selected);
          } else {
            this.closeMentionPopup();
          }
          return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeMentionPopup();
        return;
      }
    }

    if (
      (event.key === 'Backspace' || event.key === 'Delete') &&
      this.deleteMentionAtCaret(event.key)
    ) {
      event.preventDefault();
      return;
    }

    // Bắt phím tắt soạn thảo Markdown: Ctrl/Cmd + B, I, K, E, Shift+X
    const textarea = this.textareaEl()?.nativeElement;
    if (
      textarea &&
      handleMarkdownHotkeys(event, textarea, (res) => {
        textarea.value = res.value;
        this.onInput(res.value);
        queueMicrotask(() => {
          textarea.setSelectionRange(res.selectionStart, res.selectionEnd);
          textarea.focus();
          this.adjustTextareaHeight();
        });
      })
    ) {
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      if (this.isCompositionEvent(event)) return;
      event.preventDefault();
      this.submit();
    }
  }

  private deleteMentionAtCaret(key: 'Backspace' | 'Delete'): boolean {
    const textarea = this.textareaEl()?.nativeElement;
    if (!textarea) return false;
    const result = deleteMentionTokenAtomically(
      textarea.value,
      textarea.selectionStart ?? 0,
      textarea.selectionEnd ?? textarea.selectionStart ?? 0,
      key,
    );
    if (!result) return false;

    textarea.value = result.value;
    this.onInput(result.value);
    textarea.setSelectionRange(result.caret, result.caret);
    this.closeMentionPopup();
    return true;
  }

  onInput(value: string): void {
    if (
      this.suppressedPostSubmitValue !== null &&
      this.normalizeImeValue(value) === this.normalizeImeValue(this.suppressedPostSubmitValue)
    ) {
      this.forceClearTextarea();
      return;
    }
    if (value) {
      this.suppressedPostSubmitValue = null;
    }

    let processedValue = value;
    if (this.userSettings.preferences().convertEmoticons) {
      const converted = convertEmoticonsToEmoji(processedValue);
      if (converted !== processedValue) {
        processedValue = converted;
        const textarea = this.textareaEl()?.nativeElement;
        if (textarea) {
          const caret = textarea.selectionStart ?? processedValue.length;
          const diff = converted.length - value.length;
          textarea.value = converted;
          textarea.setSelectionRange(caret + diff, caret + diff);
        }
      }
    }

    this.text.set(processedValue);
    this.adjustTextareaHeight();
    this.checkMentionTrigger();
    this.checkEmojiSuggestTrigger();
    if (processedValue.trim().length > 0) {
      this.typing.emit();
    } else {
      this.stoppedTyping.emit();
    }
  }

  onKeyup(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') {
      this.checkMentionTrigger();
      this.checkEmojiSuggestTrigger();
    }
  }

  onBlur(): void {
    this.stoppedTyping.emit();
  }

  onCompositionStart(): void {
    this.isImeComposing = true;
  }

  onCompositionEnd(event: CompositionEvent): void {
    this.isImeComposing = false;
    if (this.suppressedPostSubmitValue !== null) {
      this.forceClearTextarea();
      return;
    }

    const value = (event.target as HTMLTextAreaElement | null)?.value;
    if (typeof value === 'string' && value !== this.text()) {
      this.onInput(value);
    }
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

  async onPaste(event: ClipboardEvent): Promise<void> {
    if (this.disabled() || this.context()?.kind === 'edit') return;

    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const containsFile =
      clipboard.files.length > 0 ||
      Array.from(clipboard.items || []).some((item) => item.kind === 'file');
    const containsRichHtml = (clipboard.getData('text/html') || '').trim().length > 0;
    const rawPlain = clipboard.getData('text/plain') || '';
    const containsExternalTokens = /<@&?\d+>|<#\d+>|<t:\d+>/.test(rawPlain);

    if (!containsFile && !containsRichHtml && !containsExternalTokens) return;

    // Chặn native paste để không làm mất phần text khi clipboard đồng thời có file.
    event.preventDefault();
    const textarea = this.textareaEl()?.nativeElement;
    const current = textarea?.value ?? this.text();
    const start = textarea?.selectionStart ?? current.length;
    const end = textarea?.selectionEnd ?? start;
    const payload = await extractClipboardMessage(clipboard);

    if (payload.text) {
      const inserted = insertTextAtSelection(current, payload.text, start, end);
      if (textarea) textarea.value = inserted.value;
      this.onInput(inserted.value);
      queueMicrotask(() => {
        textarea?.setSelectionRange(inserted.caret, inserted.caret);
        this.adjustTextareaHeight();
      });
    }

    if (payload.files.length > 0) {
      this.addFiles(payload.files);
    }
    if (payload.failedResourceCount > 0) {
      this.fileErrorMessage.set(
        `${payload.failedResourceCount} tệp trong nội dung sao chép bị nguồn bên ngoài chặn tải (CORS/bảo mật). Hãy tải tệp xuống rồi đính kèm trực tiếp.`,
      );
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

      const ext = f.name ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase() : '';
      const isAllowedByExt = [
        '.jpg',
        '.jpeg',
        '.jfif',
        '.png',
        '.webp',
        '.gif',
        '.svg',
        '.bmp',
        '.avif',
        '.mp3',
        '.mp4',
        '.m4v',
        '.webm',
        '.ogv',
        '.mov',
        '.qt',
        '.mkv',
        '.avi',
        '.mpeg',
        '.mpg',
        '.3gp',
        '.wmv',
        '.flv',
        '.pdf',
        '.txt',
        '.zip',
        '.7z',
        '.tar',
        '.rar',
        '.gz',
        '.docx',
      ].includes(ext);

      const isAllowedMime = allowedMimes.includes(f.type) || isAllowedByExt;

      if (!isAllowedMime) {
        this.fileErrorMessage.set(`Định dạng file "${f.name}" không được hỗ trợ.`);
        continue;
      }

      if (currentTotalBytes + runningBatchBytes + f.size > ATTACHMENT_LIMITS.MAX_TOTAL_SIZE_BYTES) {
        this.fileErrorMessage.set(`Tổng dung lượng tệp đính kèm vượt quá giới hạn 30MB.`);
        continue;
      }

      runningBatchBytes += f.size;
      const isImage =
        f.type.startsWith('image/') ||
        ['.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif', '.svg', '.bmp', '.avif'].includes(ext);
      const isAudio = f.type === 'audio/mpeg' || f.type === 'audio/mp3' || ext === '.mp3';
      const isVideo =
        f.type.startsWith('video/') ||
        [
          '.mp4',
          '.m4v',
          '.webm',
          '.ogv',
          '.mov',
          '.qt',
          '.mkv',
          '.avi',
          '.mpeg',
          '.mpg',
          '.3gp',
          '.wmv',
          '.flv',
        ].includes(ext);
      const canPreviewVideo =
        isVideo &&
        (['video/mp4', 'video/x-m4v', 'video/webm', 'video/ogg'].includes(f.type) ||
          ['.mp4', '.m4v', '.webm', '.ogv'].includes(ext));
      const mediaKind: PendingFileItem['mediaKind'] = isImage
        ? 'image'
        : isAudio
          ? 'audio'
          : isVideo
            ? 'video'
            : 'file';
      const previewUrl = mediaKind !== 'file' ? URL.createObjectURL(f) : null;

      validNewItems.push({
        id: crypto.randomUUID(),
        file: f,
        previewUrl,
        isImage,
        mediaKind,
        canPreviewVideo,
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
    this.closeMentionPopup();
    this.showGiphyPicker.set(false);
    this.showStipopPicker.set(false);
    this.showEmojiPicker.update((v) => !v);
  }

  toggleGiphyPicker(): void {
    if (this.disabled() || this.context()?.kind === 'edit') return;
    this.closeMentionPopup();
    this.showEmojiPicker.set(false);
    this.showStipopPicker.set(false);
    this.showGiphyPicker.update((v) => !v);
  }

  toggleStipopPicker(): void {
    if (this.disabled() || this.context()?.kind === 'edit') return;
    this.closeMentionPopup();
    this.showEmojiPicker.set(false);
    this.showGiphyPicker.set(false);
    this.showStipopPicker.update((v) => !v);
  }

  onGifSelected(gif: GiphyMediaDto): void {
    const currentContext = this.context();
    const isEditMode = currentContext?.kind === 'edit';
    if (isEditMode) return;

    const payload: SendMessagePayload = {
      content: '',
      externalMedia: gif,
      replyToId: currentContext?.kind === 'reply' ? currentContext.replyToId : undefined,
    };

    this.send.emit(payload);

    this.closeMentionPopup();
    this.showGiphyPicker.set(false);
    this.showStipopPicker.set(false);
    this.showEmojiPicker.set(false);
    this.stoppedTyping.emit();

    if (currentContext) {
      this.contextClosed.emit();
    }
  }

  onStickerSelected(sticker: ExternalMediaDto): void {
    const currentContext = this.context();
    const isEditMode = currentContext?.kind === 'edit';
    if (isEditMode) return;

    const payload: SendMessagePayload = {
      content: '',
      externalMedia: sticker,
      replyToId: currentContext?.kind === 'reply' ? currentContext.replyToId : undefined,
    };

    this.send.emit(payload);

    this.closeMentionPopup();
    this.showStipopPicker.set(false);
    this.showGiphyPicker.set(false);
    this.showEmojiPicker.set(false);
    this.stoppedTyping.emit();

    if (currentContext) {
      this.contextClosed.emit();
    }
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
    const maxAllowedHeight = isMobile ? Math.min(160, Math.floor(window.innerHeight * 0.32)) : 200;

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
    if (this.cooldownRemaining() > 0) {
      return;
    }

    const raw = this.text();
    let trimmed = raw.trim();
    if (this.userSettings.preferences().convertEmoticons) {
      trimmed = convertEmoticonsToEmoji(trimmed);
    }
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
      replyToId: currentContext?.kind === 'reply' ? currentContext.replyToId : undefined,
      editMessageId: isEditMode ? currentContext.messageId : undefined,
    };

    this.send.emit(payload);

    // Kích hoạt chế độ chậm (slowmode) đếm ngược nếu có cấu hình
    if (!isEditMode && this.slowmode() > 0) {
      this.startCooldown(this.slowmode());
    }

    // Reset trạng thái composer
    this.text.set('');
    this.pendingFiles.set([]);
    this.fileErrorMessage.set(null);
    this.closeMentionPopup();
    this.closeEmojiSuggestPopup();
    this.showEmojiPicker.set(false);
    this.showGiphyPicker.set(false);
    this.showStipopPicker.set(false);
    this.stoppedTyping.emit();

    const textarea = this.textareaEl()?.nativeElement;
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }

    this.guardAgainstLateImeInput(raw);

    if (currentContext) {
      this.contextClosed.emit();
    }
  }

  private isCompositionEvent(event: KeyboardEvent): boolean {
    return this.isImeComposing || event.isComposing || event.keyCode === 229;
  }

  private normalizeImeValue(value: string): string {
    return value.normalize('NFC');
  }

  private forceClearTextarea(): void {
    this.text.set('');
    const textarea = this.textareaEl()?.nativeElement;
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }
  }

  private guardAgainstLateImeInput(submittedValue: string): void {
    const generation = ++this.postSubmitResetGeneration;
    this.suppressedPostSubmitValue = submittedValue;

    queueMicrotask(() => {
      if (generation !== this.postSubmitResetGeneration) return;
      const current = this.text();
      if (!current || this.normalizeImeValue(current) === this.normalizeImeValue(submittedValue)) {
        this.forceClearTextarea();
      }
    });

    if (this.postSubmitSuppressionTimer) {
      clearTimeout(this.postSubmitSuppressionTimer);
    }
    this.postSubmitSuppressionTimer = setTimeout(() => {
      if (generation === this.postSubmitResetGeneration) {
        this.suppressedPostSubmitValue = null;
      }
      this.postSubmitSuppressionTimer = null;
    }, 300);
  }
}
