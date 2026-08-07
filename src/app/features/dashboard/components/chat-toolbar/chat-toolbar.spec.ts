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
      [detailsOpen]="open()"
      (toggleDetails)="toggled.set(true)"
    />
  `,
})
class Host {
  readonly subtitle = signal<string | null>(null);
  readonly showCall = signal(false);
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
  });

  it('bấm nút ẩn/hiện hồ sơ thì báo ra ngoài', async () => {
    const fixture = await mount();
    const nut = fixture.nativeElement.querySelector('[aria-pressed]') as HTMLButtonElement;

    nut.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.toggled()).toBe(true);
  });
});
