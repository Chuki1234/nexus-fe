import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  ChannelSummary,
  ServerGroupSummary,
  ServerSummary,
} from '../../../../core/api/shell-data';
import { ShellData } from '../../../../core/api/shell-data';
import { ServerRail } from './server-rail';

describe('ServerRail', () => {
  const mount = async (shell: ShellData = new ShellData()) => {
    await TestBed.configureTestingModule({
      imports: [ServerRail],
      providers: [provideRouter([]), { provide: ShellData, useValue: shell }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ServerRail);
    fixture.detectChanges();
    return fixture;
  };

  const groupedShell = (): ShellData => {
    const servers: ServerSummary[] = [
      {
        id: 'alpha',
        name: 'Alpha',
        iconUrl: null,
        unread: true,
        mentionCount: 2,
      },
      {
        id: 'beta',
        name: 'Beta',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
      },
      {
        id: 'solo',
        name: 'Solo',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
      },
    ];
    const serverGroups: ServerGroupSummary[] = [
      { id: 'study', name: 'Học tập', serverIds: ['alpha', 'beta'] },
    ];
    const channels: Record<string, ChannelSummary[]> = {
      alpha: [
        {
          id: 'general',
          name: 'general',
          type: 'text',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
    };

    return {
      servers: signal(servers).asReadonly(),
      serverGroups: signal(serverGroups).asReadonly(),
      channelsOf: (serverId: string) => channels[serverId] ?? [],
    } as ShellData;
  };

  it('tài khoản mới chỉ có lối vào DM, tìm kiếm và thêm server', async () => {
    const fixture = await mount();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(links.some((link) => link.getAttribute('href') === '/channels/@me')).toBe(true);
    expect(
      fixture.nativeElement
        .querySelector('a[href="/channels/@me"]')
        ?.classList.contains('server-tile'),
    ).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[data-server-id]').length).toBe(0);
    expect(fixture.nativeElement.querySelector('[data-action="global-search"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('3');
    expect(fixture.nativeElement.querySelector('ul.nexus-scrollbar')).toBeTruthy();
  });

  it('service demo ON làm rail render dữ liệu mẫu nhưng OFF lại giữ tài khoản mới rỗng', async () => {
    const shell = new ShellData();
    const fixture = await mount(shell);

    expect(fixture.nativeElement.querySelectorAll('[data-server-id]').length).toBe(0);

    shell.setDemoEnabled(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-server-id]').length).toBe(4);
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('[data-server-id]')).every((server) =>
        (server as HTMLElement).classList.contains('server-tile'),
      ),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-server-group-id="study"]')).toBeTruthy();

    shell.setDemoEnabled(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-server-id]').length).toBe(0);
  });

  it('nút tìm kiếm mô tả đủ phạm vi dù chưa nối API', async () => {
    const fixture = await mount();
    const search = fixture.nativeElement.querySelector(
      '[data-action="global-search"]',
    ) as HTMLButtonElement;

    expect(search.getAttribute('aria-label')).toContain('tin nhắn');
    expect(search.getAttribute('aria-label')).toContain('kênh thoại');
    expect(search.getAttribute('aria-label')).toContain('máy chủ');
    expect(search.classList.contains('nexus-icon-control')).toBe(true);
  });

  it('nhóm server thật có thể thu gọn mà server ngoài nhóm vẫn giữ nguyên', async () => {
    const fixture = await mount(groupedShell());
    const group = fixture.nativeElement.querySelector(
      '[data-server-group-id="study"]',
    ) as HTMLElement;
    const toggle = group.querySelector('button[aria-expanded]') as HTMLButtonElement;

    expect(group.querySelectorAll('[data-server-id]').length).toBe(2);
    expect(group.querySelectorAll('[data-server-miniature]').length).toBe(2);
    expect(fixture.nativeElement.querySelector('[data-server-id="solo"]')).toBeTruthy();
    expect(toggle.classList.contains('nexus-icon-control')).toBe(true);

    toggle.click();
    fixture.detectChanges();

    expect(group.querySelectorAll('[data-server-id]').length).toBe(0);
    expect(group.querySelectorAll('[data-server-miniature]').length).toBe(2);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[data-server-id="solo"]')).toBeTruthy();
  });

  it('render drop line cho từng khe trong group và ngoài group', async () => {
    const fixture = await mount(groupedShell());
    const groupSlots = fixture.nativeElement.querySelectorAll(
      '[data-server-drop-slot^="group-study-slot-"]',
    );
    const railSlots = fixture.nativeElement.querySelectorAll(
      '[data-server-drop-slot^="rail-slot-"]',
    );

    expect(groupSlots).toHaveLength(3);
    expect(railSlots).toHaveLength(2);
    expect(
      Array.from<Element>(fixture.nativeElement.querySelectorAll('[data-server-drop-slot]')).every(
        (slot) => slot.querySelector('.server-drop-indicator'),
      ),
    ).toBe(true);
  });

  it('drop slot ngoài group gọi đúng thao tác ungroup/reorder của ShellData', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    const fixture = await mount(shell);
    const moveOutside = vi.spyOn(shell, 'moveServerOutsideGroups');
    const rail = fixture.componentInstance as unknown as {
      dropOutsideGroupsAt: (
        event: { isPointerOverContainer: boolean; item: { data: string } },
        index: number,
      ) => void;
    };

    rail.dropOutsideGroupsAt({ isPointerOverContainer: true, item: { data: 'lofi' } }, 1);

    expect(moveOutside).toHaveBeenCalledWith('lofi', 1);
  });

  it('server có kênh mở thẳng kênh đầu tiên', async () => {
    const fixture = await mount(groupedShell());
    const alpha = fixture.nativeElement.querySelector(
      '[data-server-id="alpha"]',
    ) as HTMLAnchorElement;

    expect(alpha.getAttribute('href')).toBe('/channels/alpha/general');
  });

  it('nút thêm máy chủ mở layout chọn tạo hoặc tham gia mà chưa gọi backend', async () => {
    const fixture = await mount();
    const addServer = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm máy chủ"]',
    ) as HTMLButtonElement;

    expect(addServer.disabled).toBe(false);
    addServer.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
    const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
    const create = dialog.querySelector('[data-add-server-action="create"]') as HTMLButtonElement;

    expect(dialog.textContent).toContain('Thêm máy chủ');
    expect(create).toBeTruthy();
    expect(dialog.querySelector('[data-add-server-action="join"]')).toBeTruthy();

    create.click();
    fixture.detectChanges();

    expect(dialog.textContent).toContain('Tên máy chủ');
    const submit = Array.from(dialog.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Tạo máy chủ',
    );
    expect(submit?.disabled).toBe(true);

    (dialog.querySelector('button[aria-label="Đóng thêm máy chủ"]') as HTMLButtonElement).click();
  });
});
