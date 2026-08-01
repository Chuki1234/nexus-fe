import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ServerRail } from './server-rail';

describe('ServerRail', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [ServerRail],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ServerRail);
    fixture.detectChanges();
    return fixture;
  };

  it('mở thẳng kênh đầu tiên thay vì dừng ở trang server rỗng', async () => {
    const fixture = await mount();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    // Bấm server mà phải bấm thêm lần nữa mới đọc được gì là thừa một bước.
    expect(links.some((a) => a.getAttribute('href') === '/channels/itss/do-an')).toBe(true);
  });

  it('luôn có lối vào khu tin nhắn trực tiếp', async () => {
    const fixture = await mount();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(links.some((a) => a.getAttribute('href') === '/channels/@me')).toBe(true);
  });

  it('hiện huy hiệu số lượt nhắc tên', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('3');
  });
});
