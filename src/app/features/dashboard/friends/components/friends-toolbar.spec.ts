import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FriendsToolbar, type FriendsTab, type ThemeMode } from './friends-toolbar';

@Component({
  imports: [FriendsToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-friends-toolbar
      [(tab)]="tab"
      [(theme)]="theme"
      [activityOpen]="activityOpen()"
      [demoEnabled]="demoEnabled()"
      (toggleActivity)="activityToggled.set(true)"
      (toggleDemo)="demoEnabled.update((enabled) => !enabled)"
    />
  `,
})
class Host {
  readonly tab = signal<FriendsTab>('all');
  readonly theme = signal<ThemeMode>('dark');
  readonly activityOpen = signal(false);
  readonly activityToggled = signal(false);
  readonly demoEnabled = signal(false);
}

describe('FriendsToolbar', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  const filterButtons = (fixture: { nativeElement: HTMLElement }) =>
    Array.from(
      fixture.nativeElement.querySelectorAll('[role=group] button'),
    ) as HTMLButtonElement[];

  it('bấm tab thì báo ngược ra ngoài', async () => {
    const fixture = await mount();
    const [online] = filterButtons(fixture);

    online.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.tab()).toBe('online');
  });

  it('chỉ đúng một tab được đánh dấu đang chọn', async () => {
    const fixture = await mount();
    const pressed = filterButtons(fixture).filter((b) => b.getAttribute('aria-pressed') === 'true');

    expect(pressed.length).toBe(1);
    expect(pressed[0].textContent).toContain('Tất cả');
  });

  it('mọi bộ lọc dùng cùng contract màu cho idle, hover và selected', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('.friends-segmented')).toBeTruthy();
    expect(
      filterButtons(fixture).every((button) => button.classList.contains('nexus-filter-tab')),
    ).toBe(true);
  });

  it('dùng aria-pressed chứ không phải tablist', async () => {
    // Đây là bộ lọc trên cùng một danh sách, không phải chuyển giữa nhiều panel —
    // gắn role=tablist sẽ báo sai ngữ nghĩa cho trình đọc màn hình.
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('[role=tablist]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[role=group]')).toBeTruthy();
  });

  it('đổi từ dark sang light bằng nút theme', async () => {
    const fixture = await mount();
    const themeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Chuyển sang giao diện sáng"]',
    ) as HTMLButtonElement;

    themeButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.theme()).toBe('light');
    expect(themeButton.getAttribute('aria-pressed')).toBe('true');
    expect(themeButton.classList.contains('nexus-icon-control')).toBe(true);
  });

  it('nút demo nằm bên trái theme và phản ánh đúng trạng thái ON/OFF', async () => {
    const fixture = await mount();
    const demoButton = fixture.nativeElement.querySelector(
      'button[aria-label="Bật dữ liệu demo"]',
    ) as HTMLButtonElement;

    expect(demoButton.getAttribute('aria-pressed')).toBe('false');
    expect(demoButton.classList.contains('nexus-demo-toggle')).toBe(true);
    expect(demoButton.nextElementSibling?.getAttribute('aria-label')).toBe(
      'Chuyển sang giao diện sáng',
    );

    demoButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.demoEnabled()).toBe(true);
    expect(demoButton.getAttribute('aria-pressed')).toBe('true');
    expect(demoButton.getAttribute('aria-label')).toBe('Tắt dữ liệu demo');
  });

  it('nút panel hoạt động báo trạng thái expanded và phát sự kiện', async () => {
    const fixture = await mount();
    const panelButton = fixture.nativeElement.querySelector(
      'button[aria-label="Hiện hoạt động bạn bè"]',
    ) as HTMLButtonElement;

    expect(panelButton.getAttribute('aria-expanded')).toBe('false');
    expect(panelButton.classList.contains('nexus-icon-control')).toBe(true);
    panelButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activityToggled()).toBe(true);
  });
});
