import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContextPanel } from './context-panel';

@Component({
  imports: [ContextPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-context-panel
      title="Hồ sơ nhanh"
      [open]="open()"
      [pinned]="pinned()"
      (closed)="onClosed()"
    >
      <p data-testid="projected-content">Nội dung hồ sơ</p>
    </app-context-panel>
  `,
})
class Host {
  readonly open = signal(false);
  readonly pinned = signal(false);
  readonly closed = signal(0);

  onClosed(): void {
    this.closed.update((count) => count + 1);
  }
}

describe('ContextPanel', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('đóng mặc định nhưng vẫn chiếu đúng nội dung để CSS điều khiển responsive', async () => {
    const fixture = await mount();
    const panel = fixture.nativeElement.querySelector('aside') as HTMLElement;

    expect(panel.classList.contains('context-panel--open')).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid=projected-content]')).toBeTruthy();
  });

  it('phân biệt trạng thái mở và pinned bằng class độc lập', async () => {
    const fixture = await mount();
    const panel = fixture.nativeElement.querySelector('aside') as HTMLElement;

    fixture.componentInstance.open.set(true);
    fixture.componentInstance.pinned.set(true);
    fixture.detectChanges();

    expect(panel.classList.contains('context-panel--open')).toBe(true);
    expect(panel.classList.contains('context-panel--pinned')).toBe(true);
  });

  it('nút đóng và backdrop cùng phát sự kiện closed', async () => {
    const fixture = await mount();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.context-panel__close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.closed()).toBe(1);
    expect(
      fixture.nativeElement
        .querySelector('.context-panel__close')
        .classList.contains('nexus-icon-control'),
    ).toBe(true);

    (fixture.nativeElement.querySelector('.context-panel__backdrop') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.closed()).toBe(2);
  });

  it('phím Escape đóng panel đang mở', async () => {
    const fixture = await mount();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closed()).toBe(1);
  });

  it('hiển thị thanh kéo chia pane thành viên khi mở và hỗ trợ phím mũi tên', async () => {
    const fixture = await mount();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const handle = fixture.nativeElement.querySelector('.pane-resize-handle--member') as HTMLElement;
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('280');

    // ArrowLeft mở rộng member pane (thêm 8px)
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(handle.getAttribute('aria-valuenow')).toBe('288');

    // Shift + ArrowRight thu hẹp 32px
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));
    fixture.detectChanges();
    expect(handle.getAttribute('aria-valuenow')).toBe('256');

    // Double click reset về 280px
    handle.dispatchEvent(new MouseEvent('dblclick'));
    fixture.detectChanges();
    expect(handle.getAttribute('aria-valuenow')).toBe('280');
  });
});
