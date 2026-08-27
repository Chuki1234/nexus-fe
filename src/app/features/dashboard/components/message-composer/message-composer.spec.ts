import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  MessageComposer,
  type MessageComposerContext,
  type SendMessagePayload,
} from './message-composer';

@Component({
  imports: [MessageComposer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-message-composer
      target="#đồ-án"
      [disabled]="disabled()"
      [context]="context()"
      [mentionCandidates]="mentionCandidates()"
      [loadingMentions]="loadingMentions()"
      (send)="onSend($event)"
      (typing)="onTyping()"
      (stoppedTyping)="onStoppedTyping()"
      (contextClosed)="context.set(null)"
    />
  `,
})
class Host {
  readonly disabled = signal<boolean>(false);
  readonly context = signal<MessageComposerContext | null>(null);
  readonly mentionCandidates = signal<any[]>([]);
  readonly loadingMentions = signal<boolean>(false);
  readonly sentPayloads: SendMessagePayload[] = [];
  typingCount = 0;
  stoppedTypingCount = 0;

  onSend(payload: SendMessagePayload): void {
    this.sentPayloads.push(payload);
  }

  onTyping(): void {
    this.typingCount++;
  }

  onStoppedTyping(): void {
    this.stoppedTypingCount++;
  }
}

describe('MessageComposer', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('placeholder nêu rõ đang nhắn vào đâu', async () => {
    const fixture = await mount();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    expect(textarea.getAttribute('placeholder')).toBe('Nhắn #đồ-án');
  });

  it('ô nhập có nhãn cho trình đọc màn hình', async () => {
    const fixture = await mount();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    expect(textarea.getAttribute('aria-label')).toBe('Nhắn #đồ-án');
  });

  it('nhập text và nhấn Enter phát sự kiện send với nội dung đã trim', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    composer.onInput('  Xin chào các bạn!  ');
    fixture.detectChanges();

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
    composer.onKeydown(enterEvent);
    fixture.detectChanges();

    expect(host.sentPayloads).toHaveLength(1);
    expect(host.sentPayloads[0].content).toBe('Xin chào các bạn!');
    expect(composer.text()).toBe('');
  });

  it('Shift+Enter không kích hoạt gửi tin nhắn', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    composer.onInput('Dòng 1');
    fixture.detectChanges();

    const shiftEnterEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    composer.onKeydown(shiftEnterEvent);
    fixture.detectChanges();

    expect(host.sentPayloads).toHaveLength(0);
    expect(composer.text()).toBe('Dòng 1');
  });

  it('gửi kèm reply context sẽ đính kèm replyToId và tự động đóng context', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    host.context.set({
      kind: 'reply',
      icon: 'reply',
      label: 'Đang trả lời Minh Tài',
      description: 'Nội dung tin nhắn gốc',
      replyToId: 'msg-999',
    });
    fixture.detectChanges();

    composer.onInput('Trả lời nè');
    composer.submit();
    fixture.detectChanges();

    expect(host.sentPayloads).toHaveLength(1);
    expect(host.sentPayloads[0].replyToId).toBe('msg-999');
    expect(host.context()).toBeNull();
  });

  it('thêm file đính kèm hiển thị trong pendingFiles và gửi kèm payload', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    const file = new File(['sample text'], 'note.txt', { type: 'text/plain' });
    composer.addFiles([file]);
    fixture.detectChanges();

    expect(composer.pendingFiles().length).toBe(1);
    expect(composer.pendingFiles()[0].name).toBe('note.txt');

    composer.onInput('Xem file này');
    composer.submit();
    fixture.detectChanges();

    expect(host.sentPayloads).toHaveLength(1);
    expect(host.sentPayloads[0].files).toHaveLength(1);
    expect(host.sentPayloads[0].files?.[0].name).toBe('note.txt');
    expect(composer.pendingFiles().length).toBe(0);
  });

  it('chèn emoji Unicode vào vị trí con trỏ trong ô soạn thảo', async () => {
    const fixture = await mount();
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    composer.toggleEmojiPicker();
    expect(composer.showEmojiPicker()).toBe(true);

    composer.insertEmoji('🚀');
    expect(composer.text()).toContain('🚀');
  });

  it('khi đang nhập bằng bộ gõ IME (event.isComposing = true), Enter không kích hoạt gửi', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    composer.onInput('dang go');
    fixture.detectChanges();

    // Giả lập sự kiện Enter khi IME đang composing
    const imeEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: false,
    });
    Object.defineProperty(imeEnterEvent, 'isComposing', { value: true });

    composer.onKeydown(imeEnterEvent);
    fixture.detectChanges();

    expect(host.sentPayloads).toHaveLength(0);
    expect(composer.text()).toBe('dang go');
  });

  it('thu hồi URL.revokeObjectURL khi xoá file hoặc khi huỷ composer, và chuyển giao URL khi submit', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const imageFile = new File(['fake-png-data'], 'photo.png', { type: 'image/png' });
    composer.addFiles([imageFile]);
    fixture.detectChanges();

    expect(composer.pendingFiles().length).toBe(1);
    const item = composer.pendingFiles()[0];
    expect(item.previewUrl).toBeDefined();

    // 1. Xoá file -> revoke URL
    composer.removeFile(item.id);
    fixture.detectChanges();
    expect(revokeSpy).toHaveBeenCalledWith(item.previewUrl);

    // 2. Thêm file mới rồi submit -> chuyển quyền sở hữu previewUrl trong payload.attachments
    const newImage = new File(['fake-png-2'], 'photo2.png', { type: 'image/png' });
    composer.addFiles([newImage]);
    fixture.detectChanges();
    const item2 = composer.pendingFiles()[0];

    composer.submit();
    fixture.detectChanges();
    expect(host.sentPayloads).toHaveLength(1);
    expect(host.sentPayloads[0].attachments?.[0].previewUrl).toBe(item2.previewUrl);

    revokeSpy.mockRestore();
  });

  it('khi disabled() = true thì không cho phép gửi', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    host.disabled.set(true);
    fixture.detectChanges();

    composer.onInput('Thử gửi khi disabled');
    composer.submit();
    fixture.detectChanges();

    expect(host.sentPayloads).toHaveLength(0);
  });

  it('khi chuyển sang context edit: revoke toàn bộ pending files, xoá khay và chặn thêm file', async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // 1. Đang có file pending
    const imageFile = new File(['fake-png-data'], 'photo.png', { type: 'image/png' });
    composer.addFiles([imageFile]);
    fixture.detectChanges();

    expect(composer.pendingFiles().length).toBe(1);
    const prevUrl = composer.pendingFiles()[0].previewUrl;

    // 2. Chuyển sang context edit
    host.context.set({
      kind: 'edit',
      icon: 'edit',
      label: 'Đang chỉnh sửa',
      description: 'Nội dung tin nhắn cũ',
      messageId: 'msg-edit-1',
    });
    fixture.detectChanges();

    // Pending files đã bị dọn dẹp và URL bị revoke
    expect(composer.pendingFiles().length).toBe(0);
    expect(revokeSpy).toHaveBeenCalledWith(prevUrl);

    // 3. Trong edit mode, cố gắng thêm file qua addFiles hoặc drop/paste đều bị chặn
    const anotherFile = new File(['another'], 'another.png', { type: 'image/png' });
    composer.addFiles([anotherFile]);
    fixture.detectChanges();
    expect(composer.pendingFiles().length).toBe(0);

    // 4. Submit edit không chuyển giao attachments/files
    composer.onInput('Nội dung đã sửa');
    composer.submit();
    fixture.detectChanges();

    expect(host.sentPayloads).toHaveLength(1);
    expect(host.sentPayloads[0].content).toBe('Nội dung đã sửa');
    expect(host.sentPayloads[0].editMessageId).toBe('msg-edit-1');
    expect(host.sentPayloads[0].files).toBeUndefined();
    expect(host.sentPayloads[0].attachments).toBeUndefined();

    revokeSpy.mockRestore();
  });

  describe('Checkpoint 8: Attachment Contract & Anti-flicker', () => {
    it('C1: Từ chối file > 10MB và giữ lại các file hợp lệ trong cùng lượt chọn', async () => {
      const fixture = await mount();
      const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

      const validFile = new File(['valid-data'], 'valid.jpg', { type: 'image/jpeg' });
      const bigFile = new File([''], 'oversized.pdf', { type: 'application/pdf' });
      Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      composer.addFiles([validFile, bigFile]);
      fixture.detectChanges();

      expect(composer.fileErrorMessage()).toContain('vượt quá giới hạn 10MB');
      expect(composer.pendingFiles().length).toBe(1);
      expect(composer.pendingFiles()[0].name).toBe('valid.jpg');
    });

    it('C2: Từ chối thêm file thứ 6 (hạn mức tối đa 5 file)', async () => {
      const fixture = await mount();
      const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

      const files = Array.from({ length: 6 }, (_, i) =>
        new File([`data-${i}`], `file-${i}.png`, { type: 'image/png' })
      );

      composer.addFiles(files);
      fixture.detectChanges();

      expect(composer.fileErrorMessage()).toContain('Chỉ được gửi tối đa 5 file');
      expect(composer.pendingFiles().length).toBe(0);
    });

    it('C3: Từ chối batch tệp có tổng dung lượng vượt quá 30MB', async () => {
      const fixture = await mount();
      const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

      const f1 = new File([''], 'f1.zip', { type: 'application/zip' });
      Object.defineProperty(f1, 'size', { value: 9 * 1024 * 1024 });
      const f2 = new File([''], 'f2.zip', { type: 'application/zip' });
      Object.defineProperty(f2, 'size', { value: 9 * 1024 * 1024 });
      const f3 = new File([''], 'f3.zip', { type: 'application/zip' });
      Object.defineProperty(f3, 'size', { value: 9 * 1024 * 1024 });
      const f4 = new File([''], 'f4.zip', { type: 'application/zip' });
      Object.defineProperty(f4, 'size', { value: 9 * 1024 * 1024 }); // 9*4 = 36MB > 30MB

      composer.addFiles([f1, f2, f3, f4]);
      fixture.detectChanges();

      expect(composer.fileErrorMessage()).toContain('vượt quá giới hạn 30MB');
      // Chỉ nhận 3 file đầu (27MB <= 30MB), file thứ 4 vượt 30MB bị từ chối
      expect(composer.pendingFiles().length).toBe(3);
    });

    it('C4: Canonical MIME Whitelist - Chỉ nhận các MIME được backend định nghĩa', async () => {
      const fixture = await mount();
      const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

      const validMimes = [
        new File([''], 'img.jpg', { type: 'image/jpeg' }),
        new File([''], 'img.png', { type: 'image/png' }),
        new File([''], 'voice.mp3', { type: 'audio/mpeg' }),
        new File([''], 'clip.mp4', { type: 'video/mp4' }),
        new File([''], 'doc.pdf', { type: 'application/pdf' }),
      ];

      composer.addFiles(validMimes);
      fixture.detectChanges();
      expect(composer.pendingFiles().length).toBe(5);
      expect(composer.pendingFiles().find((item) => item.name === 'voice.mp3')?.mediaKind).toBe('audio');
      expect(composer.pendingFiles().find((item) => item.name === 'clip.mp4')?.mediaKind).toBe('video');

      // Thử file MIME không được hỗ trợ
      composer.removeFile(composer.pendingFiles()[0].id);
      const invalidMimeFile = new File(['binary'], 'program.exe', { type: 'application/x-msdownload' });
      composer.addFiles([invalidMimeFile]);
      fixture.detectChanges();

      expect(composer.fileErrorMessage()).toContain('không được hỗ trợ');
    });

    it('C5: Anti-flicker Drag Overlay - dragEnterCounter hoạt động chính xác khi di chuyển qua các phần tử con', async () => {
      const fixture = await mount();
      const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

      const fakeDragEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as DragEvent;

      // 1. Kéo vào composer (outer shell)
      composer.onDragEnter(fakeDragEvent);
      expect(composer.isDraggingOver()).toBe(true);

      // 2. Kéo vào phần tử con (child element)
      composer.onDragEnter(fakeDragEvent);
      expect(composer.isDraggingOver()).toBe(true);

      // 3. Rời khỏi phần tử con (nhưng vẫn trong shell)
      composer.onDragLeave(fakeDragEvent);
      expect(composer.isDraggingOver()).toBe(true);

      // 4. Rời hẳn khỏi composer shell
      composer.onDragLeave(fakeDragEvent);
      expect(composer.isDraggingOver()).toBe(false);
    });

    it('bấm nút GIF mở/đóng GIPHY Picker và chọn GIF phát sự kiện send ngay lập tức', async () => {
      const fixture = await mount();
      const host = fixture.componentInstance;
      const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

      expect(composer.showGiphyPicker()).toBe(false);

      // Bật picker
      composer.toggleGiphyPicker();
      fixture.detectChanges();
      expect(composer.showGiphyPicker()).toBe(true);

      // Khi chọn GIF
      const mockGif = {
        provider: 'giphy' as const,
        externalId: 'gif-test-123',
        mediaType: 'gif' as const,
        title: 'Dancing Cat',
        creatorUsername: 'cat',
        pageUrl: 'https://giphy.com/gifs/cat-123',
        previewUrl: 'https://media0.giphy.com/media/123/200w.webp',
        displayUrl: 'https://media0.giphy.com/media/123/giphy.gif',
        mp4Url: 'https://media1.giphy.com/media/123/200w.mp4',
        width: 400,
        height: 300,
      };

      composer.onGifSelected(mockGif);
      fixture.detectChanges();

      expect(composer.showGiphyPicker()).toBe(false);
      expect(host.sentPayloads).toHaveLength(1);
      expect(host.sentPayloads[0].externalMedia).toEqual(mockGif);
    });

    it('bấm nút Sticker mở/đóng Stipop Picker và chọn sticker phát sự kiện send ngay lập tức', async () => {
      const fixture = await mount();
      const host = fixture.componentInstance;
      const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;

      expect(composer.showStipopPicker()).toBe(false);

      // Bật sticker picker
      composer.toggleStipopPicker();
      fixture.detectChanges();
      expect(composer.showStipopPicker()).toBe(true);

      // Đảm bảo Emoji và GIF picker bị đóng
      expect(composer.showEmojiPicker()).toBe(false);
      expect(composer.showGiphyPicker()).toBe(false);

      // Khi chọn sticker
      const mockSticker = {
        provider: 'stipop' as const,
        externalId: '45268',
        mediaType: 'sticker' as const,
        title: 'Happy Sticker',
        creatorUsername: 'amam',
        pageUrl: 'https://stipop.io/package/2199',
        previewUrl: 'https://img.stipop.io/prev.png',
        displayUrl: 'https://img.stipop.io/disp.png',
        mp4Url: null,
        width: 300,
        height: 300,
      };

      composer.onStickerSelected(mockSticker);
      fixture.detectChanges();

      expect(composer.showStipopPicker()).toBe(false);
      expect(host.sentPayloads).toHaveLength(1);
      expect(host.sentPayloads[0].externalMedia).toEqual(mockSticker);
    });

    describe('Mention Autocomplete (@username & @everyone)', () => {
      const mockCandidates = [
        {
          id: 'user-1',
          username: 'minhtai',
          displayName: 'Minh Tài',
          avatarUrl: null,
          role: 'Admin',
        },
        {
          id: 'user-2',
          username: 'alex_dev',
          displayName: 'Alex Developer',
          avatarUrl: null,
          role: 'Member',
        },
        {
          id: 'everyone',
          username: 'everyone',
          displayName: 'everyone',
          avatarUrl: null,
          isEveryone: true,
          description: 'Thông báo tới tất cả thành viên',
        },
      ];

      it('khi gõ ký tự @ xuất hiện mention popup và lọc theo query', async () => {
        const fixture = await mount();
        const host = fixture.componentInstance;
        const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;
        host.mentionCandidates.set(mockCandidates);
        fixture.detectChanges();

        const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
        textarea.value = 'Chào @minh';
        textarea.selectionStart = 10;
        textarea.selectionEnd = 10;
        composer.onInput('Chào @minh');
        fixture.detectChanges();

        expect(composer.showMentionPopup()).toBe(true);
        expect(composer.mentionQuery()).toBe('minh');
        expect(composer.filteredMentionCandidates()).toHaveLength(1);
        expect(composer.filteredMentionCandidates()[0].username).toBe('minhtai');
      });

      it('bấm nút Mention (@) trên toolbar chèn @ và mở popup', async () => {
        const fixture = await mount();
        const host = fixture.componentInstance;
        const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;
        host.mentionCandidates.set(mockCandidates);
        fixture.detectChanges();

        composer.triggerMentionFromButton();
        fixture.detectChanges();

        expect(composer.showMentionPopup()).toBe(true);
        expect(composer.text()).toBe('@');
        expect(composer.filteredMentionCandidates()).toHaveLength(3);
      });

      it('điều hướng phím ArrowDown, ArrowUp và nhấn Enter chọn candidate chèn @username vào text', async () => {
        const fixture = await mount();
        const host = fixture.componentInstance;
        const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;
        host.mentionCandidates.set(mockCandidates);
        fixture.detectChanges();

        const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
        textarea.value = '@';
        textarea.selectionStart = 1;
        textarea.selectionEnd = 1;
        composer.onInput('@');
        fixture.detectChanges();

        expect(composer.showMentionPopup()).toBe(true);
        expect(composer.selectedMentionIndex()).toBe(0);

        // ArrowDown -> chuyển sang item 1 (alex_dev)
        composer.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(composer.selectedMentionIndex()).toBe(1);

        // Enter -> chọn alex_dev
        const enterEvt = new KeyboardEvent('keydown', { key: 'Enter' });
        composer.onKeydown(enterEvt);
        fixture.detectChanges();

        expect(composer.showMentionPopup()).toBe(false);
        expect(composer.text()).toBe('@alex_dev ');
        // Đảm bảo không gửi tin nhắn ngay lập tức khi nhấn Enter để chọn mention
        expect(host.sentPayloads).toHaveLength(0);
      });

      it('nhấn Escape khi đang mở mention popup chỉ đóng popup mà không hủy composer context', async () => {
        const fixture = await mount();
        const host = fixture.componentInstance;
        const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;
        host.mentionCandidates.set(mockCandidates);
        fixture.detectChanges();

        composer.triggerMentionFromButton();
        fixture.detectChanges();
        expect(composer.showMentionPopup()).toBe(true);

        composer.onEscape();
        fixture.detectChanges();
        expect(composer.showMentionPopup()).toBe(false);
      });

      it('tính độc quyền: mở Emoji / GIF / Sticker picker sẽ đóng Mention Popup và ngược lại', async () => {
        const fixture = await mount();
        const host = fixture.componentInstance;
        const composer = fixture.debugElement.children[0].componentInstance as MessageComposer;
        host.mentionCandidates.set(mockCandidates);
        fixture.detectChanges();

        // Mở mention popup
        composer.triggerMentionFromButton();
        expect(composer.showMentionPopup()).toBe(true);

        // Mở Emoji picker
        composer.toggleEmojiPicker();
        expect(composer.showMentionPopup()).toBe(false);
        expect(composer.showEmojiPicker()).toBe(true);

        // Mở lại mention popup
        composer.openMentionPopup();
        expect(composer.showMentionPopup()).toBe(true);
        expect(composer.showEmojiPicker()).toBe(false);
      });
    });
  });
});
