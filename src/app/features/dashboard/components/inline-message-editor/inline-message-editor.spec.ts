import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InlineMessageEditor } from './inline-message-editor';

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
    let saved: string | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '  Nội dung đã sửa  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = fixture.nativeElement.querySelector('.inline-editor-save-btn') as HTMLButtonElement;
    saveBtn.click();
    fixture.detectChanges();

    expect(saved).toBe('Nội dung đã sửa');
  });

  it('nhấn Enter (không kèm Shift) phát ra save', () => {
    let saved: string | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Tin nhắn mới';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false }));
    fixture.detectChanges();

    expect(saved).toBe('Tin nhắn mới');
  });

  it('nhấn Shift + Enter không submit save', () => {
    let saved: string | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Tin nhắn nhiều dòng';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    fixture.detectChanges();

    expect(saved).toBeNull();
  });

  it('nhấn Escape hoặc bấm nút Hủy phát ra output cancel', () => {
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(cancelled).toBe(true);

    cancelled = false;
    const cancelBtn = fixture.nativeElement.querySelector('.inline-editor-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(cancelled).toBe(true);
  });

  it('chặn submit khi nội dung rỗng hoặc chỉ có khoảng trắng', () => {
    let saved: string | null = null;
    component.save.subscribe((val) => (saved = val));

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '    ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = fixture.nativeElement.querySelector('.inline-editor-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(saved).toBeNull();
  });

  it('cho phép chỉnh sửa nội dung dài hơn 4000 ký tự', () => {
    let saved: string | null = null;
    component.save.subscribe((value) => (saved = value));
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'a'.repeat(4001);
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = fixture.nativeElement.querySelector('.inline-editor-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    saveBtn.click();
    expect(saved).toBe('a'.repeat(4001));
    expect(textarea.hasAttribute('maxlength')).toBe(false);
  });

  it('khi expired=true: hiển thị cảnh báo hết hạn và khóa nút Lưu', () => {
    fixture.componentRef.setInput('expired', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Đã hết thời gian chỉnh sửa 5 phút.');
    const saveBtn = fixture.nativeElement.querySelector('.inline-editor-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('khi errorMessage được cung cấp: hiển thị thông báo lỗi', () => {
    fixture.componentRef.setInput('errorMessage', 'Có lỗi mạng khi lưu');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Có lỗi mạng khi lưu');
  });
});
