import { ChangeDetectionStrategy, Component, Type, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Avatar } from './avatar/avatar';
import { EmptyState } from './empty-state/empty-state';
import { SearchField } from './search-field/search-field';
import { SectionLabel } from './section-label/section-label';
import { StatusDot } from './status-dot/status-dot';
import { UnreadBadge } from './unread-badge/unread-badge';

/** Dựng một host nhỏ để bind input, rồi trả về fixture đã chạy change detection. */
async function mount<T>(component: Type<T>): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({ imports: [component] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

describe('Avatar', () => {
  @Component({
    imports: [Avatar],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-avatar [name]="name()" [src]="src()" [presence]="presence()" />`,
  })
  class Host {
    readonly name = signal('Minh Tài');
    readonly src = signal<string | null>(null);
    readonly presence = signal<'online' | 'offline' | null>(null);
  }

  it('rơi về chữ cái đầu khi không có ảnh', async () => {
    const fixture = await mount(Host);

    expect(fixture.nativeElement.textContent).toContain('M');
    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
  });

  it('vẫn đọc được tên cho trình đọc màn hình khi chỉ hiện chữ cái', async () => {
    const fixture = await mount(Host);

    expect(fixture.nativeElement.querySelector('.sr-only').textContent).toContain('Minh Tài');
  });

  it('dùng ảnh khi có src, và đặt alt là tên', async () => {
    const fixture = await mount(Host);
    fixture.componentInstance.src.set('/anh.png');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/anh.png');
    expect(img.getAttribute('alt')).toBe('Minh Tài');
  });

  it('ảnh hỏng thì rơi về chữ cái thay vì để vỡ ảnh', async () => {
    const fixture = await mount(Host);
    fixture.componentInstance.src.set('/khong-ton-tai.png');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('M');
  });

  it('chỉ hiện chấm trạng thái khi được truyền presence', async () => {
    const fixture = await mount(Host);
    expect(fixture.nativeElement.querySelector('app-status-dot')).toBeFalsy();

    fixture.componentInstance.presence.set('online');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-status-dot')).toBeTruthy();
  });

  it('tên rỗng không làm vỡ component', async () => {
    const fixture = await mount(Host);
    fixture.componentInstance.name.set('   ');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('?');
  });
});

describe('StatusDot', () => {
  @Component({
    imports: [StatusDot],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-status-dot [presence]="presence()" />`,
  })
  class Host {
    readonly presence = signal<'online' | 'idle' | 'dnd' | 'offline'>('online');
  }

  it('đọc thành nhãn tiếng Việt cho từng trạng thái', async () => {
    const fixture = await mount(Host);
    expect(fixture.nativeElement.textContent).toContain('Trực tuyến');

    fixture.componentInstance.presence.set('dnd');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Không làm phiền');

    fixture.componentInstance.presence.set('offline');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ngoại tuyến');
  });

  it('chỉ trạng thái trực tuyến dùng màu nhấn của brand', async () => {
    // DESIGN-voltagent.md: xanh chỉ dành cho CTA và chỉ báo trạng thái sống.
    const fixture = await mount(Host);
    expect(fixture.nativeElement.querySelector('span').className).toContain('bg-primary');

    fixture.componentInstance.presence.set('idle');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).not.toContain('bg-primary');
  });
});

describe('UnreadBadge', () => {
  @Component({
    imports: [UnreadBadge],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-unread-badge [count]="count()" [max]="9" />`,
  })
  class Host {
    readonly count = signal(0);
  }

  it('không chiếm chỗ khi không có gì chưa đọc', async () => {
    const fixture = await mount(Host);

    // Thẻ rỗng vẫn đẩy lệch hàng, nên phải không render gì cả.
    expect(fixture.nativeElement.querySelector('span')).toBeFalsy();
  });

  it('hiện số khi có tin chưa đọc', async () => {
    const fixture = await mount(Host);
    fixture.componentInstance.count.set(3);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('quá ngưỡng thì rút gọn thay vì kéo dài huy hiệu', async () => {
    const fixture = await mount(Host);
    fixture.componentInstance.count.set(150);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('9+');
  });
});

describe('SearchField', () => {
  @Component({
    imports: [SearchField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-search-field placeholder="Tìm kiếm" [(value)]="query" />`,
  })
  class Host {
    readonly query = signal('');
  }

  it('gõ vào ô thì cập nhật ngược ra ngoài', async () => {
    const fixture = await mount(Host);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'mon';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('mon');
  });

  it('nút xoá chỉ xuất hiện khi đã có chữ', async () => {
    const fixture = await mount(Host);
    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();

    fixture.componentInstance.query.set('mon');
    fixture.detectChanges();

    const clear = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(clear).toBeTruthy();

    clear.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.query()).toBe('');
  });

  it('không bo tròn hoàn toàn — pill chỉ dành cho thẻ trạng thái', async () => {
    // DESIGN-voltagent.md: "Buttons are tight 6 px rounded rectangles (not pills)".
    const fixture = await mount(Host);
    const box = fixture.nativeElement.querySelector('div') as HTMLElement;

    expect(box.className).toContain('rounded-sm');
    expect(box.className).not.toContain('rounded-pill');
  });
});

describe('EmptyState', () => {
  @Component({
    imports: [EmptyState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-empty-state icon="forum" message="Chưa có gì" [title]="title()" />`,
  })
  class Host {
    readonly title = signal<string | null>(null);
  }

  it('hiện icon và câu mô tả', async () => {
    const fixture = await mount(Host);

    expect(fixture.nativeElement.textContent).toContain('forum');
    expect(fixture.nativeElement.textContent).toContain('Chưa có gì');
  });

  it('tiêu đề là tuỳ chọn', async () => {
    const fixture = await mount(Host);
    expect(fixture.nativeElement.querySelector('h2')).toBeFalsy();

    fixture.componentInstance.title.set('Kênh thoại');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Kênh thoại');
  });
});

describe('SectionLabel', () => {
  @Component({
    imports: [SectionLabel],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <app-section-label text="Tin nhắn trực tiếp">
        <button slot="action" type="button">Thêm</button>
      </app-section-label>
    `,
  })
  class Host {}

  it('là thẻ tiêu đề để nằm đúng cây heading của trang', async () => {
    const fixture = await mount(Host);

    expect(fixture.nativeElement.querySelector('h3')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Tin nhắn trực tiếp');
  });

  it('nhận nút hành động chiếu vào bên phải', async () => {
    const fixture = await mount(Host);

    expect(fixture.nativeElement.querySelector('h3 button')?.textContent).toContain('Thêm');
  });
});
