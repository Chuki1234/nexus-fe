import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChatToolbar } from './chat-toolbar';

@Component({
  imports: [ChatToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-chat-toolbar
      title="đồ-án"
      [subtitle]="subtitle()"
      [showCallActions]="showCall()"
      [showDetailsAction]="showDetails()"
      [detailsOpen]="open()"
      (toggleDetails)="toggled.set(true)"
    />
  `,
})
class Host {
  readonly subtitle = signal<string | null>(null);
  readonly showCall = signal(false);
  readonly showDetails = signal(true);
  readonly open = signal(true);
  readonly toggled = signal(false);
}

describe('ChatToolbar', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('hiện tiêu đề, và chỉ hiện phụ đề khi có', async () => {
    const fixture = await mount();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('đồ-án');
    expect(fixture.nativeElement.querySelector('.chat-toolbar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p')).toBeFalsy();

    fixture.componentInstance.subtitle.set('Tiến độ tuần');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toContain('Tiến độ tuần');
  });

  it('nút gọi chỉ có trong tin nhắn riêng', async () => {
    const fixture = await mount();
    const demNut = () => fixture.nativeElement.querySelectorAll('button').length;
    const khongGoi = demNut();

    fixture.componentInstance.showCall.set(true);
    fixture.detectChanges();

    // Thêm đúng hai nút: gọi thoại và gọi video.
    expect(demNut()).toBe(khongGoi + 2);
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('button')).every((button) =>
        (button as HTMLButtonElement).classList.contains('nexus-icon-control'),
      ),
    ).toBe(true);
  });

  it('bấm nút ẩn/hiện panel chi tiết thì báo ra ngoài', async () => {
    const fixture = await mount();
    const nut = fixture.nativeElement.querySelector('[aria-expanded]') as HTMLButtonElement;

    nut.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.toggled()).toBe(true);
  });

  it('nút panel dùng aria-expanded thay vì trạng thái pressed', async () => {
    const fixture = await mount();
    const nut = fixture.nativeElement.querySelector('[aria-expanded]') as HTMLButtonElement;

    expect(nut.getAttribute('aria-expanded')).toBe('true');
    expect(nut.hasAttribute('aria-pressed')).toBe(false);
    expect(nut.classList.contains('nexus-icon-control')).toBe(true);
  });

  it('có thể ẩn action chi tiết ở DM để không chiếm ownership Profile', async () => {
    const fixture = await mount();
    fixture.componentInstance.showDetails.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-expanded]')).toBeNull();
  });
});
