import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  CANONICAL_SERVER_TEMPLATES,
  ServersApiService,
} from '../../../../core/api/servers-api.service';
import { ConversationsApiService } from '../../../../core/api/conversations-api.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import { FriendsStore } from '../../../../features/dashboard/friends/services/friends-store';
import { ServerRail } from './server-rail';

describe('ServerRail', () => {
  let mockServersApi: {
    getTemplates: ReturnType<typeof vi.fn>;
    createServer: ReturnType<typeof vi.fn>;
    listServers: ReturnType<typeof vi.fn>;
  };
  let mockConversationsApi: {
    listConversations: ReturnType<typeof vi.fn>;
    getOrCreateDm: ReturnType<typeof vi.fn>;
  };

  const mount = async (setupGroupedData = false) => {
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

    mockConversationsApi = {
      listConversations: vi.fn().mockResolvedValue([]),
      getOrCreateDm: vi.fn().mockResolvedValue({ id: 'conv-123' }),
    };

    await TestBed.configureTestingModule({
      imports: [ServerRail],
      providers: [
        provideRouter([{ path: '**', component: class {} }]),
        { provide: ServersApiService, useValue: mockServersApi },
        { provide: ConversationsApiService, useValue: mockConversationsApi },
      ],
    }).compileComponents();

    const serversStore = TestBed.inject(ServersStore);
    const friendsStore = TestBed.inject(FriendsStore);

    if (setupGroupedData) {
      serversStore.hydrateServers([
        {
          id: 'alpha',
          name: 'Alpha Server',
          iconUrl: null,
          channels: [
            { id: 'general', name: 'general', type: 'text', topic: null, unread: false, mentionCount: 0 },
          ],
        },
        {
          id: 'beta',
          name: 'Beta Server',
          iconUrl: null,
          channels: [
            { id: 'chat', name: 'chat', type: 'text', topic: null, unread: false, mentionCount: 0 },
            { id: 'study-room', name: 'Phòng học nhóm', type: 'voice', topic: null, unread: false, mentionCount: 0 },
          ],
        },
        {
          id: 'solo',
          name: 'Solo Server',
          iconUrl: null,
          channels: [],
        },
      ]);
      serversStore.serverGroups.set([
        { id: 'study', name: 'Nhóm Học Tập', serverIds: ['alpha', 'beta'] },
      ]);
      (friendsStore as any).friendList.set([
        {
          id: 'lofi',
          username: 'lofi',
          displayName: 'Lofi Girl',
          avatarUrl: null,
          presence: 'online',
          statusMessage: 'Chill beats to study to',
        },
      ]);
    }

    const fixture = TestBed.createComponent(ServerRail);
    fixture.detectChanges();
    return fixture;
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
    const fixture = await mount(true);
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
    const fixture = await mount(true);
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
    const fixture = await mount(true);
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

    expect(dialog.textContent?.toLowerCase()).toContain('xem trước các kênh');
    expect(dialog.textContent).toContain('chào-mừng');
    expect(dialog.textContent).toContain('tìm-đồng-đội');
    expect(dialog.textContent).toContain('Phòng chờ');

    const input = dialog.querySelector('input[matInput]') as HTMLInputElement;
    expect(input.placeholder).toBe('Ví dụ: Nhóm học Nexus');

    (dialog.querySelector('button[aria-label="Đóng thêm máy chủ"]') as HTMLButtonElement).click();
  });

  it('nhập tên hợp lệ enable nút Tạo máy chủ và gọi serversApi kèm templateId thành công', async () => {
    const fixture = await mount();
    const router = TestBed.inject(Router);
    const serversStore = TestBed.inject(ServersStore);
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
    expect(serversStore.servers().map((s) => s.name)).toContain('Đội Game Nexus');
    expect(navigateSpy).toHaveBeenCalledWith(['/channels', 's-gaming', 'c-1']);
  });

  it('báo lỗi inline khi API tạo server thất bại và không đóng dialog', async () => {
    const fixture = await mount();
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

    const gamingCard = dialog.querySelector('[data-template-id="gaming"]') as HTMLButtonElement;
    gamingCard.click();
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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
      const fixture = await mount(true);
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

  describe('Discord Drag & Drop and Folder System (Canonical State Machine)', () => {
    it('render railItems dưới dạng mảng 1D thống nhất', async () => {
      const fixture = await mount(true);
      const items = fixture.componentInstance['railItems']();

      expect(items.length).toBe(2);
      expect(items[0].kind).toBe('folder');
      expect(items[1].kind).toBe('server');
    });

    it('giữ tile server ở kích thước 48px và căn icon chính giữa', async () => {
      const fixture = await mount(true);
      const tile = fixture.nativeElement.querySelector('.server-tile') as HTMLElement;

      const styles = getComputedStyle(tile);

      expect(styles.display).toBe('flex');
      expect(styles.width).toBe('3rem');
      expect(styles.height).toBe('3rem');
      expect(styles.flexBasis).toBe('3rem');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('center');
    });

    it('không render static drop slots mà chỉ render dynamic active slot khi có intent', async () => {
      const fixture = await mount(true);
      const slotsBefore = fixture.nativeElement.querySelectorAll('.server-active-drop-slot');
      expect(slotsBefore.length).toBe(0);

      // Kích hoạt intent insert-before cho 'solo'
      fixture.componentInstance['activeIntent'].set({
        kind: 'insert-before',
        sourceServerId: 'alpha',
        targetId: 'solo',
      });
      fixture.detectChanges();

      const slotsAfter = fixture.nativeElement.querySelectorAll('.server-active-drop-slot');
      expect(slotsAfter.length).toBe(1);
    });

    it('chuyển sang merge-active khi intent là merge-server', async () => {
      const fixture = await mount(true);
      const component = fixture.componentInstance;

      expect(component['isMergeActive']('solo')).toBe(false);

      component['activeIntent'].set({
        kind: 'merge-server',
        sourceServerId: 'alpha',
        targetServerId: 'solo',
      });
      fixture.detectChanges();

      expect(component['isMergeActive']('solo')).toBe(true);
      const soloTile = fixture.nativeElement.querySelector('[data-server-id="solo"]');
      expect(soloTile?.classList.contains('server-tile--merge-active')).toBe(true);
    });

    it('Escape key hủy phiên kéo lập tức và reset activeIntent về none', async () => {
      const fixture = await mount(true);
      const component = fixture.componentInstance;

      component['startServerDrag']('solo');
      component['activeIntent'].set({
        kind: 'insert-before',
        sourceServerId: 'solo',
        targetId: 'alpha',
      });

      expect(component['draggingServerId']()).toBe('solo');

      // Nhấn Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      component['handleGlobalShortcut'](escapeEvent);

      expect(component['draggingServerId']()).toBeNull();
      expect(component['activeIntent']()).toEqual({ kind: 'none' });
    });

    it('finishServerDrag gọi commitServerDrop trên ServersStore và cập nhật dropAnnouncement', async () => {
      const fixture = await mount(true);
      const serversStore = TestBed.inject(ServersStore);
      const component = fixture.componentInstance;

      component['startServerDrag']('solo');
      component['activeIntent'].set({
        kind: 'merge-server',
        sourceServerId: 'solo',
        targetServerId: 'alpha',
      });

      component['finishServerDrag']();
      fixture.detectChanges();

      expect(component['draggingServerId']()).toBeNull();
      expect(component['dropAnnouncement']()).toContain('Đã thêm máy chủ Solo Server vào nhóm');
    });
  });
});
