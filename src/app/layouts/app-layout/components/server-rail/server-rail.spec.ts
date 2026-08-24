import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideRouter, Router } from '@angular/router';
import {
  CANONICAL_SERVER_TEMPLATES,
  ServersApiService,
} from '../../../../core/api/servers-api.service';
import type {
  ChannelSummary,
  ConversationSummary,
  ServerGroupSummary,
  ServerSummary,
} from '../../../../core/api/shell-data';
import { ShellData } from '../../../../core/api/shell-data';
import { ServersStore } from '../../../../core/servers/servers.store';
import { ServerRail } from './server-rail';

describe('ServerRail', () => {
  let mockServersApi: {
    getTemplates: ReturnType<typeof vi.fn>;
    createServer: ReturnType<typeof vi.fn>;
    listServers: ReturnType<typeof vi.fn>;
  };

  const mount = async (shell: ShellData = new ShellData()) => {
    mockServersApi = {
      getTemplates: vi.fn().mockResolvedValue([...CANONICAL_SERVER_TEMPLATES]),
      createServer: vi.fn().mockResolvedValue({
        server: { id: 's-1', name: 'Máy chủ mới', iconUrl: null, unread: false, mentionCount: 0 },
        channels: [
          {
            id: 'c-1',
            name: 'chung',
            type: 'text',
            topic: null,
            unread: false,
            mentionCount: 0,
          },
        ],
      }),
      listServers: vi.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [ServerRail],
      providers: [
        provideRouter([{ path: '**', component: class {} }]),
        { provide: ShellData, useValue: shell },
        { provide: ServersApiService, useValue: mockServersApi },
      ],
    }).compileComponents();

    const serversStore = TestBed.inject(ServersStore);
    if (shell.servers().length > 0) {
      serversStore.serverList.set(shell.servers());
    }

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

    const groups: ServerGroupSummary[] = [
      {
        id: 'study',
        name: 'Study',
        serverIds: ['alpha', 'beta'],
      },
    ];

    const conversations: ConversationSummary[] = [
      {
        id: 'dm-1',
        name: 'Lofi Girl',
        statusMessage: null,
        presence: 'online',
        unread: false,
      },
    ];

    const channelsByServer: Record<string, ChannelSummary[]> = {
      alpha: [
        {
          id: 'general',
          name: 'chung',
          type: 'text',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
      beta: [
        {
          id: 'general',
          name: 'chung',
          type: 'text',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
      solo: [
        {
          id: 'general',
          name: 'chung',
          type: 'text',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
        {
          id: 'voice-room',
          name: 'Phòng học nhóm',
          type: 'voice',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
    };

    return {
      servers: signal(servers),
      serverGroups: signal(groups),
      channelsOf: (serverId: string) => channelsByServer[serverId] ?? [],
      conversations: signal(conversations),
      reorderServers: vi.fn(),
      setServerGroup: vi.fn(),
      ungroupServer: vi.fn(),
      reorderServerWithinGroup: vi.fn(),
      setServerGroupsOrder: vi.fn(),
      moveServerOutsideGroups: vi.fn(),
      upsertServerWithChannels: vi.fn(),
      hydrateServers: vi.fn(),
      demoEnabled: signal(false),
      setDemoEnabled: vi.fn(),
    } as unknown as ShellData;
  };

  it('nút Command mô tả phạm vi điều hướng mà không giả là tìm nội dung chat', async () => {
    const fixture = await mount();
    const search = fixture.nativeElement.querySelector(
      '[data-action="global-search"]',
    ) as HTMLButtonElement;

    expect(search.getAttribute('aria-label')).toContain('tin nhắn trực tiếp');
    expect(search.getAttribute('aria-label')).toContain('kênh');
    expect(search.getAttribute('aria-label')).toContain('máy chủ');
    expect(search.getAttribute('aria-label')).not.toContain('nội dung');
    expect(search.getAttribute('aria-keyshortcuts')).toContain('Control+K');
    expect(search.classList.contains('nexus-icon-control')).toBe(true);
  });

  it('lọc nhanh kết quả theo từ khóa trong Command Center', async () => {
    const fixture = await mount(groupedShell());
    const search = fixture.nativeElement.querySelector(
      '[data-action="global-search"]',
    ) as HTMLButtonElement;
    search.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
    const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
    const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

    expect(dialog.textContent).toContain('Nexus Command');
    expect(dialog.textContent).toContain('Điều hướng toàn Nexus');
    expect(dialog.querySelector('.command-center__scope')?.textContent).toContain('Máy chủ');
    expect(dialog.querySelector('.command-center__scope')?.textContent).toContain('Kênh');
    expect(dialog.querySelector('.command-center__scope')?.textContent).toContain('Tin nhắn riêng');
    expect(dialog.querySelector('[data-command-result="conversation"]')).toBeTruthy();
    expect(dialog.querySelector('[data-command-result="server"]')).toBeTruthy();

    input.value = 'lofi';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(dialog.querySelector('[data-command-result]')?.getAttribute('data-command-result')).toBe(
      'conversation',
    );

    (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
  });

  it('hiện empty state khi không có server, kênh hay DM', async () => {
    const fixture = await mount();
    const search = fixture.nativeElement.querySelector(
      '[data-action="global-search"]',
    ) as HTMLButtonElement;
    search.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
    const dialog = documentBody.querySelector('.command-center') as HTMLElement;

    expect(dialog.textContent).toContain('Không gian của bạn đang trống');
    expect(dialog.querySelector('[data-command-result]')).toBeNull();

    (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
  });

  it('nhóm server thật có thể thu gọn mà server ngoài nhóm vẫn giữ nguyên', async () => {
    const fixture = await mount(groupedShell());
    let group = fixture.nativeElement.querySelector(
      '[data-server-group-id="study"]',
    ) as HTMLElement;
    let toggle = group.querySelector('button[aria-expanded]') as HTMLButtonElement;

    // Trạng thái mở rộng ban đầu: danh sách con hiện 2 server
    expect(group.querySelectorAll('[data-server-id]').length).toBe(2);
    expect(group.getAttribute('data-group-state')).toBe('expanded');
    expect(group.classList.contains('server-group-shell--expanded')).toBe(true);
    expect(group.querySelector('[data-expanded-group-members]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-server-id="solo"]')).toBeTruthy();

    // Click để thu gọn folder
    toggle.click();
    fixture.detectChanges();

    group = fixture.nativeElement.querySelector('[data-server-group-id="study"]') as HTMLElement;
    toggle = group.querySelector('button[aria-expanded]') as HTMLButtonElement;

    // Trạng thái thu gọn: không hiện server-id chi tiết mà hiện 2 miniatures 2x2 grid
    expect(group.querySelectorAll('[data-server-id]').length).toBe(0);
    expect(group.querySelectorAll('[data-server-miniature]').length).toBe(2);
    expect(group.getAttribute('data-group-state')).toBe('collapsed');
    expect(group.classList.contains('server-group-shell--expanded')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[data-server-id="solo"]')).toBeTruthy();
  });

  it('server có kênh mở thẳng kênh đầu tiên', async () => {
    const fixture = await mount(groupedShell());
    const alpha = fixture.nativeElement.querySelector(
      '[data-server-id="alpha"]',
    ) as HTMLAnchorElement;

    expect(alpha.getAttribute('href')).toBe('/channels/alpha/general');
  });

  it('luồng chọn mẫu và xem trước kênh hoạt động trọn vẹn', async () => {
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

    // 1. Bấm Tạo máy chủ -> chuyển sang danh sách mẫu
    create.click();
    fixture.detectChanges();

    expect(dialog.textContent).toContain('Tạo máy chủ của bạn');
    expect(dialog.textContent).toContain('Tạo mẫu riêng');
    expect(dialog.textContent).toContain('Gaming');
    expect(dialog.textContent).toContain('Bạn bè');
    expect(dialog.textContent).toContain('Nhóm học tập');
    expect(dialog.textContent).toContain('Câu lạc bộ trường học');

    // 2. Chọn mẫu Gaming -> chuyển sang form đặt tên và xem trước kênh
    const gamingCard = dialog.querySelector('[data-template-id="gaming"]') as HTMLButtonElement;
    expect(gamingCard).toBeTruthy();
    gamingCard.click();
    fixture.detectChanges();

    expect(dialog.textContent).toContain('Mẫu: Gaming');
    expect(dialog.textContent).toContain('# chào-mừng');
    expect(dialog.textContent).toContain('# tìm-đồng-đội');
    expect(dialog.textContent).toContain('# ảnh-và-clip');
    expect(dialog.textContent).toContain('Phòng chờ');
    expect(dialog.textContent).toContain('Đội 1');

    const submit = Array.from(dialog.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Tạo máy chủ',
    );
    expect(submit?.disabled).toBe(true);

    (dialog.querySelector('button[aria-label="Đóng thêm máy chủ"]') as HTMLButtonElement).click();
  });

  it('nhập tên hợp lệ enable nút Tạo máy chủ và gọi serversApi kèm templateId thành công', async () => {
    const shell = new ShellData();
    const fixture = await mount(shell);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    mockServersApi.createServer.mockResolvedValue({
      server: {
        id: 's-gaming',
        name: 'Đội Game Nexus',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
      },
      channels: [
        { id: 'c-1', name: 'chào-mừng', type: 'text', topic: null, unread: false, mentionCount: 0 },
        {
          id: 'c-2',
          name: 'tìm-đồng-đội',
          type: 'text',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
        {
          id: 'c-3',
          name: 'Phòng chờ',
          type: 'voice',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
    });

    const addServer = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm máy chủ"]',
    ) as HTMLButtonElement;
    addServer.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
    const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
    const create = dialog.querySelector('[data-add-server-action="create"]') as HTMLButtonElement;
    create.click();
    fixture.detectChanges();

    const gamingCard = dialog.querySelector('[data-template-id="gaming"]') as HTMLButtonElement;
    gamingCard.click();
    fixture.detectChanges();

    const input = dialog.querySelector('input[matInput]') as HTMLInputElement;
    input.value = 'Đội Game Nexus';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submit = Array.from(dialog.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tạo máy chủ'),
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    submit.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockServersApi.createServer).toHaveBeenCalledWith('Đội Game Nexus', 'gaming');
    expect(shell.servers().map((s) => s.name)).toContain('Đội Game Nexus');
    expect(navigateSpy).toHaveBeenCalledWith(['/channels', 's-gaming', 'c-1']);
  });

  it('báo lỗi inline khi API tạo server thất bại và không đóng dialog', async () => {
    const shell = new ShellData();
    const fixture = await mount(shell);
    mockServersApi.createServer.mockRejectedValue(new Error('Tên máy chủ đã được sử dụng.'));

    const addServer = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm máy chủ"]',
    ) as HTMLButtonElement;
    addServer.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
    const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
    const create = dialog.querySelector('[data-add-server-action="create"]') as HTMLButtonElement;
    create.click();
    fixture.detectChanges();

    const customCard = dialog.querySelector('[data-template-id="custom"]') as HTMLButtonElement;
    customCard.click();
    fixture.detectChanges();

    const input = dialog.querySelector('input[matInput]') as HTMLInputElement;
    input.value = 'Lỗi Server';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submit = Array.from(dialog.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tạo máy chủ'),
    ) as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dialog.textContent).toContain('Tên máy chủ đã được sử dụng.');
    (dialog.querySelector('button[aria-label="Đóng thêm máy chủ"]') as HTMLButtonElement)?.click();
  });

  describe('Quick Switcher theo tiền tố (*, @, #, !)', () => {
    it('lọc đúng MÁY CHỦ khi gõ tiền tố * hoặc * kèm từ khóa', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '*';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const results = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((el) => el.getAttribute('data-command-result') === 'server')).toBe(true);

      input.value = '* Alpha';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const filtered = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(filtered.length).toBe(1);
      expect(filtered[0].textContent).toContain('Alpha');

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('lọc đúng TIN NHẮN RIÊNG khi gõ tiền tố @ hoặc @ kèm từ khóa', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '@';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const results = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((el) => el.getAttribute('data-command-result') === 'conversation')).toBe(
        true,
      );

      input.value = '@ lofi';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const filtered = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(filtered.length).toBe(1);
      expect(filtered[0].textContent).toContain('Lofi Girl');

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('lọc đúng KÊNH CHỮ khi gõ tiền tố # mà không lẫn kênh thoại', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '#';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const results = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((el) => el.getAttribute('data-command-result') === 'text-channel')).toBe(
        true,
      );

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('lọc đúng KÊNH THOẠI khi gõ tiền tố ! mà không lẫn kênh chữ', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '!';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const results = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every((el) => el.getAttribute('data-command-result') === 'voice-channel'),
      ).toBe(true);
      expect(results[0].textContent).toContain('Phòng học nhóm');

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('prefix có hoặc không có khoảng trắng cho cùng kết quả', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '@lofi';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const countWithoutSpace = dialog.querySelectorAll('[data-command-result]').length;

      input.value = '@ lofi';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const countWithSpace = dialog.querySelectorAll('[data-command-result]').length;

      expect(countWithoutSpace).toBe(countWithSpace);
      expect(countWithSpace).toBe(1);

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('tìm không dấu tiếng Việt vẫn match từ khóa có dấu', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '! phong hoc';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const results = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(results.length).toBe(1);
      expect(results[0].textContent).toContain('Phòng học nhóm');

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('bấm chip tiền tố cập nhật input, scope và active chip', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const serverChip = dialog.querySelector(
        'button[aria-label="Lọc theo máy chủ (*)"]',
      ) as HTMLButtonElement;

      serverChip.click();
      fixture.detectChanges();

      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;
      expect(input.value.startsWith('*')).toBe(true);
      expect(serverChip.classList.contains('command-chip--active')).toBe(true);

      const results = Array.from(dialog.querySelectorAll('[data-command-result]'));
      expect(results.every((el) => el.getAttribute('data-command-result') === 'server')).toBe(true);

      const allChip = Array.from(dialog.querySelectorAll('.command-chip')).find(
        (chip) => chip.textContent?.trim() === 'Tất cả',
      ) as HTMLButtonElement;
      allChip.click();
      fixture.detectChanges();

      expect(allChip.classList.contains('command-chip--active')).toBe(true);

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('điều hướng danh sách bằng phím ArrowDown/ArrowUp và Enter để mở', async () => {
      const fixture = await mount(groupedShell());
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;

      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '*';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const options = dialog.querySelectorAll('[role="option"]');
      expect(options.length).toBeGreaterThan(1);
      expect(options[0].getAttribute('aria-selected')).toBe('true');

      // Nhấn ArrowDown di chuyển active index
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      fixture.detectChanges();
      expect(options[1].getAttribute('aria-selected')).toBe('true');

      // Nhấn ArrowUp quay lại
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      fixture.detectChanges();
      expect(options[0].getAttribute('aria-selected')).toBe('true');

      // Nhấn Enter điều hướng
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalled();
    });

    it('hiển thị empty state phù hợp theo từng scope', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      input.value = '! khong-co-kenh-thoai-nay';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(dialog.textContent).toContain('Không tìm thấy kênh thoại phù hợp');
      expect(dialog.querySelector('[data-command-result]')).toBeNull();

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });

    it('đảm bảo đầy đủ thuộc tính Accessibility combobox/listbox/option', async () => {
      const fixture = await mount(groupedShell());
      const search = fixture.nativeElement.querySelector(
        '[data-action="global-search"]',
      ) as HTMLButtonElement;
      search.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const documentBody = fixture.nativeElement.ownerDocument.body as HTMLElement;
      const dialog = documentBody.querySelector('.nexus-add-server-dialog') as HTMLElement;
      const input = dialog.querySelector('.command-center__input') as HTMLInputElement;

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.getAttribute('aria-controls')).toBe('command-results-list');
      expect(input.getAttribute('aria-describedby')).toBe('command-prefix-guide');

      const listbox = dialog.querySelector('#command-results-list');
      expect(listbox?.getAttribute('role')).toBe('listbox');

      (dialog.querySelector('button[aria-label="Đóng tìm kiếm"]') as HTMLButtonElement).click();
    });
  });

  describe('Discord Drag & Drop and Folder System', () => {
    const dropEvent = (serverId: string) =>
      ({
        isPointerOverContainer: true,
        item: { data: serverId },
      }) as never;

    it('render railItems dưới dạng mảng 1D thống nhất', async () => {
      const fixture = await mount(groupedShell());
      const items = fixture.componentInstance['railItems']();

      expect(items.length).toBe(2);
      expect(items[0].kind).toBe('folder');
      expect(items[1].kind).toBe('server');
    });

    it('giữ tile server ở kích thước 48px và căn icon chính giữa', async () => {
      const fixture = await mount(groupedShell());
      const tile = fixture.nativeElement.querySelector('.server-tile') as HTMLElement;

      const styles = getComputedStyle(tile);

      expect(styles.display).toBe('flex');
      expect(styles.width).toBe('3rem');
      expect(styles.height).toBe('3rem');
      expect(styles.flexBasis).toBe('3rem');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('center');
    });

    it('render khe thả cố định ở main rail và trong folder đang mở', async () => {
      const fixture = await mount(groupedShell());
      const slots = fixture.nativeElement.querySelectorAll('.server-drop-slot');

      expect(slots.length).toBeGreaterThanOrEqual(6);
      expect(fixture.nativeElement.querySelectorAll('.server-drop-line').length).toBe(0);
    });

    it('tách rõ trạng thái đổi vị trí và trạng thái gom nhóm', async () => {
      const fixture = await mount(groupedShell());
      const component = fixture.componentInstance;

      component['startServerDrag']('solo');
      component['activateDropSlot']('rail-slot-0');
      expect(component['activeDropSlot']()).toBe('rail-slot-0');
      expect(component['activeGroupingTarget']()).toBeNull();

      component['activateGroupingTarget']('folder', 'study');
      expect(component['activeDropSlot']()).toBeNull();
      expect(component['groupingTargetIsActive']('folder', 'study')).toBe(true);
    });

    it('không cho gom một server vào chính nó hoặc vào server cùng folder', async () => {
      const fixture = await mount(groupedShell());
      const component = fixture.componentInstance;

      component['startServerDrag']('alpha');
      component['activateGroupingTarget']('server', 'alpha');
      expect(component['activeGroupingTarget']()).toBeNull();

      component['activateGroupingTarget']('server', 'beta');
      expect(component['activeGroupingTarget']()).toBeNull();
    });

    it('thả lên server độc lập tạo folder mới và thu gọn folder vừa tạo', async () => {
      const shell = groupedShell();
      shell.groupServers = vi.fn().mockReturnValue('generated-folder');
      const fixture = await mount(shell);
      const component = fixture.componentInstance;

      component['startServerDrag']('alpha');
      component['dropOnServer'](dropEvent('alpha'), 'solo');

      expect(shell.groupServers).toHaveBeenCalledWith('alpha', 'solo');
      expect(component['collapsedGroups']().has('generated-folder')).toBe(true);
    });

    it('thả lên server đã nằm trong folder không tự thu gọn folder đang mở', async () => {
      const shell = groupedShell();
      shell.groupServers = vi.fn().mockReturnValue('study');
      const fixture = await mount(shell);
      const component = fixture.componentInstance;

      component['startServerDrag']('solo');
      component['dropOnServer'](dropEvent('solo'), 'alpha');

      expect(shell.groupServers).toHaveBeenCalledWith('solo', 'alpha');
      expect(component['collapsedGroups']().has('study')).toBe(false);
    });

    it('thả vào khe main rail gọi moveServerOutsideGroups với mixed insertion index', async () => {
      const shell = groupedShell();
      shell.moveServerOutsideGroups = vi.fn();
      const fixture = await mount(shell);
      const component = fixture.componentInstance;

      component['startServerDrag']('alpha');
      component['dropOutsideGroupsAt'](dropEvent('alpha'), 1);

      expect(shell.moveServerOutsideGroups).toHaveBeenCalledWith('alpha', 1);
    });

    it('thả vào khe folder gọi moveServerToGroup đúng vị trí', async () => {
      const shell = groupedShell();
      shell.moveServerToGroup = vi.fn();
      const fixture = await mount(shell);
      const component = fixture.componentInstance;

      component['startServerDrag']('solo');
      component['dropIntoGroupAt'](dropEvent('solo'), 'study', 1);

      expect(shell.moveServerToGroup).toHaveBeenCalledWith('solo', 'study', 1);
    });
  });
});
