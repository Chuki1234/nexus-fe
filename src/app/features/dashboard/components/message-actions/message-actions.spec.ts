import { TestBed } from '@angular/core/testing';
import type { MessageComposerContext } from '../message-composer/message-composer';
import { MessageActions } from './message-actions';

describe('MessageActions', () => {
  const mount = async (ownMessage = false, canEdit = false) => {
    await TestBed.configureTestingModule({
      imports: [MessageActions],
    }).compileComponents();

    const fixture = TestBed.createComponent(MessageActions);
    fixture.componentRef.setInput('messageId', 'message-1');
    fixture.componentRef.setInput('author', 'Minh Tài');
    fixture.componentRef.setInput('excerpt', 'Một đoạn tin nhắn để xem trước.');
    fixture.componentRef.setInput('ownMessage', ownMessage);
    fixture.componentRef.setInput('canEdit', canEdit);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('có toolbar đủ reaction, reply và more với nhãn truy cập', async () => {
    const fixture = await mount();
    const toolbar = fixture.nativeElement.querySelector('[role="toolbar"]') as HTMLElement;

    expect(toolbar.getAttribute('aria-label')).toContain('Minh Tài');
    expect(toolbar.querySelectorAll('button')).toHaveLength(3);
    expect(toolbar.querySelector('button[aria-label="Thêm cảm xúc"]')).toBeTruthy();
    expect(toolbar.querySelector('button[aria-label="Trả lời"]')).toBeTruthy();
    expect(toolbar.querySelector('button[aria-label="Thêm thao tác"]')).toBeTruthy();
  });

  it('chọn reaction phát ra sự kiện output reaction', async () => {
    const fixture = await mount();
    const emittedReactions: string[] = [];
    fixture.componentInstance.reaction.subscribe((emoji) => emittedReactions.push(emoji));

    const trigger = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm cảm xúc"]',
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const option = document.body.querySelector(
      '.nexus-message-reaction-menu .message-reaction-option',
    ) as HTMLButtonElement;
    option.click();
    fixture.detectChanges();

    expect(emittedReactions).toContain('👍');
  });

  it('khi ownMessage=true và canEdit=true: menu có Chỉnh sửa và Thu hồi tin nhắn', async () => {
    const fixture = await mount(true, true);
    const contexts: MessageComposerContext[] = [];
    fixture.componentInstance.action.subscribe((context) => contexts.push(context));

    const more = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm thao tác"]',
    ) as HTMLButtonElement;
    more.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const edit = Array.from(document.body.querySelectorAll('.nexus-message-more-menu button')).find(
      (button) => button.textContent?.includes('Chỉnh sửa'),
    ) as HTMLButtonElement;
    expect(edit).toBeTruthy();
    edit.click();
    fixture.detectChanges();
    expect(contexts.at(-1)?.kind).toBe('edit');

    more.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const remove = Array.from(document.body.querySelectorAll('.nexus-message-more-menu button')).find(
      (button) => button.textContent?.includes('Thu hồi tin nhắn'),
    ) as HTMLButtonElement;
    expect(remove).toBeTruthy();
  });

  it('khi ownMessage=true nhưng canEdit=false (hết 5 phút): nút Chỉnh sửa biến mất khỏi DOM, vẫn có Thu hồi tin nhắn', async () => {
    const fixture = await mount(true, false);
    const more = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm thao tác"]',
    ) as HTMLButtonElement;

    more.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const menuButtons = Array.from(
      document.body.querySelectorAll('.nexus-message-more-menu button'),
    ) as HTMLButtonElement[];

    const edit = menuButtons.find((button) => button.textContent?.includes('Chỉnh sửa'));
    expect(edit).toBeUndefined(); // Không tồn tại trong DOM

    const recall = menuButtons.find((button) => button.textContent?.includes('Thu hồi tin nhắn'));
    expect(recall).toBeTruthy();
  });

  it('khi ownMessage=false: nút Chỉnh sửa không có, nút xóa là Xóa khỏi phía bạn', async () => {
    const fixture = await mount(false, false);
    const contexts: MessageComposerContext[] = [];
    fixture.componentInstance.action.subscribe((context) => contexts.push(context));
    const more = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm thao tác"]',
    ) as HTMLButtonElement;

    more.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const menuButtons = Array.from(
      document.body.querySelectorAll('.nexus-message-more-menu button'),
    ) as HTMLButtonElement[];

    const edit = menuButtons.find((button) => button.textContent?.includes('Chỉnh sửa'));
    expect(edit).toBeUndefined();

    const remove = menuButtons.find((button) => button.textContent?.includes('Xóa khỏi phía bạn'))!;
    expect(remove).toBeTruthy();
    remove.click();
    fixture.detectChanges();
    expect(contexts.at(-1)?.kind).toBe('delete');
  });
});
