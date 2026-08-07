import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageComposer } from './message-composer';

@Component({
  imports: [MessageComposer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-message-composer target="#đồ-án" />`,
})
class Host {}

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
  });
});
