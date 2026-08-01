import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConversationList } from './conversation-list';

describe('ConversationList', () => {
  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [ConversationList],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConversationList);
    fixture.detectChanges();
    return fixture;
  };

  it('có lối vào trang Bạn bè và danh sách hộp thoại', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Bạn bè');
    expect(fixture.nativeElement.textContent).toContain('Tin nhắn trực tiếp');
    expect(fixture.nativeElement.textContent).toContain('ho_be');
  });

  it('không có mục thương mại kiểu Discord', async () => {
    // Nitro / Cửa hàng / Nhiệm Vụ là tính năng trả phí của Discord, Nexus không có.
    const fixture = await mount();
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Nitro');
    expect(text).not.toContain('Cửa hàng');
    expect(text).not.toContain('Nhiệm Vụ');
  });

  it('mỗi hộp thoại trỏ đúng route của nó', async () => {
    const fixture = await mount();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(links.some((a) => a.getAttribute('href') === '/channels/@me/ho-be')).toBe(true);
  });
});
