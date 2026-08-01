import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UnreadBadge } from './unread-badge';

@Component({
  imports: [UnreadBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-unread-badge [count]="count()" [max]="9" />`,
})
class Host {
  readonly count = signal(0);
}

describe('UnreadBadge', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('không chiếm chỗ khi không có gì chưa đọc', async () => {
    const fixture = await mount();

    // Thẻ rỗng vẫn đẩy lệch hàng, nên phải không render gì cả.
    expect(fixture.nativeElement.querySelector('span')).toBeFalsy();
  });

  it('hiện số khi có tin chưa đọc', async () => {
    const fixture = await mount();
    fixture.componentInstance.count.set(3);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('quá ngưỡng thì rút gọn thay vì kéo dài huy hiệu', async () => {
    const fixture = await mount();
    fixture.componentInstance.count.set(150);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('9+');
  });
});
