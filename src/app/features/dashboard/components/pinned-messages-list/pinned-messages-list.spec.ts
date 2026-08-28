import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PinnedMessagesList } from './pinned-messages-list';
import type { MessageResponseDto } from '../../../../core/api/messages-api.service';

describe('PinnedMessagesList', () => {
  let component: PinnedMessagesList;
  let fixture: ComponentFixture<PinnedMessagesList>;

  const mockMessage: MessageResponseDto = {
    id: 'msg-1',
    conversationId: 'dm-1',
    channelId: null,
    authorId: 'user-1',
    content: 'Tin nhắn quan trọng đã ghim',
    type: 'default',
    replyToId: null,
    clientNonce: null,
    editedAt: null,
    deletedAt: null,
    isForwarded: false,
    externalMedia: null,
    createdAt: new Date().toISOString(),
    attachments: [],
    reactions: [],
    author: {
      id: 'user-1',
      username: 'tuilatai',
      displayName: 'Minh Tài',
      avatarUrl: 'https://example.com/avatar.png',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PinnedMessagesList],
    }).compileComponents();

    fixture = TestBed.createComponent(PinnedMessagesList);
    component = fixture.componentInstance;
  });

  it('hiển thị empty state khi không có tin nhắn được ghim', () => {
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.pins-empty');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('Chưa có tin nhắn nào được ghim');
  });

  it('render danh sách tin nhắn đã ghim kèm nút bỏ ghim', () => {
    fixture.componentRef.setInput('messages', [mockMessage]);
    fixture.detectChanges();

    const entry = fixture.nativeElement.querySelector('.pin-entry');
    expect(entry).toBeTruthy();
    expect(entry.textContent).toContain('Tin nhắn quan trọng đã ghim');
    expect(entry.textContent).toContain('Minh Tài');

    const unpinBtn = fixture.nativeElement.querySelector('.pin-entry__unpin') as HTMLButtonElement;
    expect(unpinBtn).toBeTruthy();
    expect(unpinBtn.getAttribute('aria-label')).toContain('Bỏ ghim tin nhắn');
  });

  it('bấm nút bỏ ghim phát ra output unpin kèm message', () => {
    const unpinSpy = vi.fn();
    component.unpin.subscribe(unpinSpy);

    fixture.componentRef.setInput('messages', [mockMessage]);
    fixture.detectChanges();

    const unpinBtn = fixture.nativeElement.querySelector('.pin-entry__unpin') as HTMLButtonElement;
    unpinBtn.click();

    expect(unpinSpy).toHaveBeenCalledWith(mockMessage);
  });

  it('bấm nút đi tới tin nhắn phát ra output jump kèm message', () => {
    const jumpSpy = vi.fn();
    component.jump.subscribe(jumpSpy);

    fixture.componentRef.setInput('messages', [mockMessage]);
    fixture.detectChanges();

    const jumpBtn = fixture.nativeElement.querySelector('.pin-entry__jump') as HTMLButtonElement;
    jumpBtn.click();

    expect(jumpSpy).toHaveBeenCalledWith(mockMessage);
  });
});
