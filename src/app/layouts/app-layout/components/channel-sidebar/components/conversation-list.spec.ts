import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShellData } from '../../../../../core/api/shell-data';
import { ConversationList } from './conversation-list';

describe('ConversationList', () => {
  const mount = async (shell: ShellData = new ShellData()) => {
    await TestBed.configureTestingModule({
      imports: [ConversationList],
      providers: [provideRouter([]), { provide: ShellData, useValue: shell }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConversationList);
    fixture.detectChanges();
    return fixture;
  };

  it('có lối vào trang Bạn bè và empty-state cho người mới', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Bạn bè');
    expect(fixture.nativeElement.textContent).toContain('Tin nhắn trực tiếp');
    expect(fixture.nativeElement.textContent).toContain('Chưa có cuộc trò chuyện');
    expect(fixture.nativeElement.querySelectorAll('app-avatar').length).toBe(0);
    expect(
      fixture.nativeElement
        .querySelector('a[href="/channels/@me"]')
        .classList.contains('nexus-nav-item'),
    ).toBe(true);
  });

  it('không có mục thương mại kiểu Discord', async () => {
    // Nitro / Cửa hàng / Nhiệm Vụ là tính năng trả phí của Discord, Nexus không có.
    const fixture = await mount();
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Nitro');
    expect(text).not.toContain('Cửa hàng');
    expect(text).not.toContain('Nhiệm Vụ');
  });

  it('không tạo route cuộc trò chuyện giả cho tài khoản mới', async () => {
    const fixture = await mount();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(links.filter((a) => a.getAttribute('href')?.startsWith('/channels/@me/')).length).toBe(
      0,
    );
  });

  it('demo căn avatar trong slot riêng để Material không bóp méo trạng thái', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount(shell);
    const slots = Array.from(
      fixture.nativeElement.querySelectorAll('.conversation-avatar-slot'),
    ) as HTMLElement[];

    expect(slots.length).toBe(shell.conversations().length);
    expect(slots.every((slot) => slot.querySelector('app-avatar'))).toBe(true);
    expect(slots.every((slot) => slot.classList.contains('mat-mdc-list-item-icon'))).toBe(true);
    expect(
      slots.every(
        (slot) => !slot.querySelector('app-avatar')?.classList.contains('mat-mdc-list-item-icon'),
      ),
    ).toBe(true);
  });
});
