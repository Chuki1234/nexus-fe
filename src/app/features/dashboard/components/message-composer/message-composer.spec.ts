import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageComposer, type MessageComposerContext } from './message-composer';

@Component({
  imports: [MessageComposer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-message-composer
      target="#đồ-án"
      [context]="context()"
      (contextClosed)="context.set(null)"
    />
  `,
})
class Host {
  readonly context = signal<MessageComposerContext | null>(null);
}

describe('MessageComposer', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('placeholder nêu rõ đang nhắn vào đâu', async () => {
    const fixture = await mount();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.getAttribute('placeholder')).toBe('Nhắn #đồ-án');
  });

  it('ô nhập có nhãn cho trình đọc màn hình', async () => {
    const fixture = await mount();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.getAttribute('aria-label')).toBe('Nhắn #đồ-án');
  });

  it('còn khoá cho tới khi P4 nối việc gửi thật', async () => {
    const fixture = await mount();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.composer-shell')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.composer-core')).toBeTruthy();
  });

  it('hiện và đóng context thao tác nhưng không mở khóa input', async () => {
    const fixture = await mount();
    fixture.componentInstance.context.set({
      kind: 'reply',
      icon: 'reply',
      label: 'Trả lời Phan Thế Mon',
      description: 'Một đoạn tin nhắn để trích dẫn.',
    });
    fixture.detectChanges();

    const context = fixture.nativeElement.querySelector('.composer-context') as HTMLElement;
    expect(context.getAttribute('data-context-kind')).toBe('reply');
    expect(context.textContent).toContain('Trả lời Phan Thế Mon');
    expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(true);

    const close = fixture.nativeElement.querySelector(
      'button[aria-label="Đóng thao tác tin nhắn"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.composer-context')).toBeNull();
  });
});
