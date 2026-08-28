import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InlineMessageEditor, type InlineMessageEditPayload } from './inline-message-editor';

describe('InlineMessageEditor', () => {
  let fixture: ComponentFixture<InlineMessageEditor>;
  let component: InlineMessageEditor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineMessageEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(InlineMessageEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('messageId', '101');
    fixture.componentRef.setInput('initialContent', 'Nội dung ban đầu');
    fixture.componentRef.setInput('createdAt', new Date().toISOString());
    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('errorMessage', null);
    fixture.componentRef.setInput('expired', false);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('prefill nội dung ban đầu từ initialContent', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Nội dung ban đầu');
  });

  it('bấm nút Lưu hoặc Enter phát ra output save kèm nội dung đã trim', () => {
    let saved: InlineMessageEditPayload | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '  Nội dung đã sửa  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = fixture.nativeElement.querySelector(
      '.inline-editor-save-btn',
    ) as HTMLButtonElement;
    saveBtn.click();
    fixture.detectChanges();

    expect(saved).toEqual({ content: 'Nội dung đã sửa', files: [] });
  });

  it('nhấn Enter (không kèm Shift) phát ra save', () => {
    let saved: InlineMessageEditPayload | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Tin nhắn mới';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false }));
    fixture.detectChanges();

    expect(saved).toEqual({ content: 'Tin nhắn mới', files: [] });
  });

  it('nhấn Shift + Enter không submit save', () => {
    let saved: InlineMessageEditPayload | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Tin nhắn nhiều dòng';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    fixture.detectChanges();

    expect(saved).toBeNull();
  });

  it('Backspace một lần xoá nguyên tag @username khi chỉnh sửa tin nhắn', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Chào @minhtai bạn';
    textarea.dispatchEvent(new Event('input'));
    textarea.setSelectionRange(14, 14);

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }));
    fixture.detectChanges();

    expect(textarea.value).toBe('Chào bạn');
    expect(component.draft()).toBe('Chào bạn');
    expect(textarea.selectionStart).toBe(5);
  });

  it('nhấn Escape hoặc bấm nút Hủy phát ra output cancel', () => {
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(cancelled).toBe(true);

    cancelled = false;
    const cancelBtn = fixture.nativeElement.querySelector(
      '.inline-editor-cancel-btn',
    ) as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(cancelled).toBe(true);
  });

  it('chặn submit khi nội dung rỗng hoặc chỉ có khoảng trắng', () => {
    let saved: InlineMessageEditPayload | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '    ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = fixture.nativeElement.querySelector(
      '.inline-editor-save-btn',
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(saved).toBeNull();
  });

  it('cho phép chỉnh sửa nội dung dài hơn 4000 ký tự', () => {
    let saved: InlineMessageEditPayload | null = null;
    component.save.subscribe((value) => (saved = value));
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'a'.repeat(4001);
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = fixture.nativeElement.querySelector(
      '.inline-editor-save-btn',
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    saveBtn.click();
    expect(saved).toEqual({ content: 'a'.repeat(4001), files: [] });
    expect(textarea.hasAttribute('maxlength')).toBe(false);
  });

  it('khi expired=true: hiển thị cảnh báo hết hạn và khóa nút Lưu', () => {
    fixture.componentRef.setInput('expired', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Đã hết thời gian chỉnh sửa 5 phút.');
    const saveBtn = fixture.nativeElement.querySelector(
      '.inline-editor-save-btn',
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('khi errorMessage được cung cấp: hiển thị thông báo lỗi', () => {
    fixture.componentRef.setInput('errorMessage', 'Có lỗi mạng khi lưu');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Có lỗi mạng khi lưu');
  });

  it('paste đồng thời text và ảnh thành nội dung cùng tệp đính kèm mới', async () => {
    const image = new File(['image'], 'clipboard.png', { type: 'image/png' });
    const clipboard = {
      files: [image],
      items: [{ kind: 'file', getAsFile: () => image }],
      getData: (type: string) => (type === 'text/plain' ? ' và ảnh mới' : ''),
    } as unknown as DataTransfer;
    const preventDefault = vi.fn();

    await component['onPaste']({
      clipboardData: clipboard,
      preventDefault,
    } as unknown as ClipboardEvent);
    fixture.detectChanges();

    expect(preventDefault).toHaveBeenCalled();
    expect(component.draft()).toBe('Nội dung ban đầu và ảnh mới');
    expect(component.pendingFiles()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.inline-editor-file')).toBeTruthy();

    let saved: InlineMessageEditPayload | null = null;
    component.save.subscribe((value) => (saved = value));
    component['submitSave']();
    expect(saved).toEqual({ content: 'Nội dung ban đầu và ảnh mới', files: [image] });
  });
});
