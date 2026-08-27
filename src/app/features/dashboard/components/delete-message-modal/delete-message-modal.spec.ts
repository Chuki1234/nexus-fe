import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeleteMessageModal } from './delete-message-modal';

describe('DeleteMessageModal', () => {
  let component: DeleteMessageModal;
  let fixture: ComponentFixture<DeleteMessageModal>;

  const mockMessage: any = {
    id: '101',
    conversationId: 'conv-1',
    channelId: null,
    authorId: 'user-1',
    author: {
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
    },
    content: 'Tin nhắn thử nghiệm cần xóa',
    createdAt: '2026-08-25T12:00:00Z',
    type: 'default',
    isForwarded: false,
    replyToId: null,
    clientNonce: null,
    editedAt: null,
    deletedAt: null,
    status: 'persisted',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteMessageModal],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteMessageModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', mockMessage);
    fixture.componentRef.setInput('canRecall', true);
    fixture.detectChanges();
  });

  it('standalone mode giữ default an toàn là for_me', () => {
    expect(component).toBeTruthy();
    expect((component as any).selectedScope()).toBe('for_me');
  });

  it('chuyển đổi selectedScope khi selectScope được gọi', () => {
    component.selectScope('everyone');
    expect((component as any).selectedScope()).toBe('everyone');

    component.selectScope('for_me');
    expect((component as any).selectedScope()).toBe('for_me');
  });

  it('emit confirm với scope đã chọn khi canRecall = true', () => {
    const confirmSpy = vi.fn();
    component.confirm.subscribe(confirmSpy);

    component.selectScope('everyone');
    component.onConfirm();
    expect(confirmSpy).toHaveBeenCalledWith('everyone');
  });

  it('emit confirm với for_me khi canRecall = false dù selectedScope là everyone', () => {
    fixture.componentRef.setInput('canRecall', false);
    fixture.detectChanges();

    const confirmSpy = vi.fn();
    component.confirm.subscribe(confirmSpy);

    component.selectScope('everyone');
    component.onConfirm();
    expect(confirmSpy).toHaveBeenCalledWith('for_me');
  });

  it('emit close khi nhấn phím Escape', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onEscapeKey(event);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('không emit confirm hay close khi isSubmitting = true', () => {
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const confirmSpy = vi.fn();
    const closeSpy = vi.fn();
    component.confirm.subscribe(confirmSpy);
    component.close.subscribe(closeSpy);

    component.onConfirm();
    expect(confirmSpy).not.toHaveBeenCalled();

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onEscapeKey(event);
    expect(closeSpy).not.toHaveBeenCalled();
  });
});

describe('DeleteMessageModal trong MatDialog', () => {
  it('mặc định chọn everyone khi người dùng có quyền thu hồi', async () => {
    const close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [DeleteMessageModal],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            message: { id: '101' },
            canRecall: true,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();

    const dialogFixture = TestBed.createComponent(DeleteMessageModal);
    const dialogComponent = dialogFixture.componentInstance;
    dialogFixture.detectChanges();

    expect((dialogComponent as any).selectedScope()).toBe('everyone');
    dialogComponent.onConfirm();
    expect(close).toHaveBeenCalledWith('everyone');
  });
});
