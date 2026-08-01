import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FriendsToolbar, type FriendsTab } from './friends-toolbar';

@Component({
  imports: [FriendsToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-friends-toolbar [(tab)]="tab" />`,
})
class Host {
  readonly tab = signal<FriendsTab>('all');
}

describe('FriendsToolbar', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  const filterButtons = (fixture: { nativeElement: HTMLElement }) =>
    Array.from(fixture.nativeElement.querySelectorAll('[role=group] button')) as HTMLButtonElement[];

  it('bấm tab thì báo ngược ra ngoài', async () => {
    const fixture = await mount();
    const [online] = filterButtons(fixture);

    online.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.tab()).toBe('online');
  });

  it('chỉ đúng một tab được đánh dấu đang chọn', async () => {
    const fixture = await mount();
    const pressed = filterButtons(fixture).filter(
      (b) => b.getAttribute('aria-pressed') === 'true',
    );

    expect(pressed.length).toBe(1);
    expect(pressed[0].textContent).toContain('Tất cả');
  });

  it('dùng aria-pressed chứ không phải tablist', async () => {
    // Đây là bộ lọc trên cùng một danh sách, không phải chuyển giữa nhiều panel —
    // gắn role=tablist sẽ báo sai ngữ nghĩa cho trình đọc màn hình.
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('[role=tablist]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[role=group]')).toBeTruthy();
  });
});
