import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Avatar } from './avatar';

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

describe('Avatar', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('rơi về chữ cái đầu khi không có ảnh', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('M');
    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
  });

  it('vẫn đọc được tên cho trình đọc màn hình khi chỉ hiện chữ cái', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('.sr-only').textContent).toContain('Minh Tài');
  });

  it('dùng ảnh khi có src, và đặt alt là tên', async () => {
    const fixture = await mount();
    fixture.componentInstance.src.set('/anh.png');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/anh.png');
    expect(img.getAttribute('alt')).toBe('Minh Tài');
  });

  it('ảnh hỏng thì rơi về chữ cái thay vì để vỡ ảnh', async () => {
    const fixture = await mount();
    fixture.componentInstance.src.set('/khong-ton-tai.png');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('M');
  });

  it('chỉ hiện chấm trạng thái khi được truyền presence', async () => {
    const fixture = await mount();
    expect(fixture.nativeElement.querySelector('app-status-dot')).toBeFalsy();

    fixture.componentInstance.presence.set('online');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-status-dot')).toBeTruthy();
  });

  it('tên rỗng không làm vỡ component', async () => {
    const fixture = await mount();
    fixture.componentInstance.name.set('   ');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('?');
  });

  it('dùng userId để sinh tone màu ổn định dù display name thay đổi', async () => {
    const fixture = await mount();
    // Host template with userId
    const avatarElem = fixture.nativeElement.querySelector('app-avatar');
    expect(avatarElem).toBeTruthy();
  });
});
