import { TestBed } from '@angular/core/testing';
import { ServersStore } from './servers.store';

describe('ServersStore', () => {
  let store: ServersStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ServersStore],
    });
    store = TestBed.inject(ServersStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('phải khởi tạo với trạng thái rỗng', () => {
    expect(store.servers()).toEqual([]);
    expect(store.serverCount()).toBe(0);
    expect(store.activeServerId()).toBeNull();
  });

  it('hydrateServers nạp danh sách servers và channels chính xác', () => {
    const data = [
      {
        id: 'srv-1',
        name: 'Gaming Server',
        iconUrl: null,
        channels: [
          {
            id: 'c-1',
            name: 'general',
            type: 'text' as const,
            topic: null,
            unread: false,
            mentionCount: 0,
          },
          {
            id: 'c-2',
            name: 'Voice 1',
            type: 'voice' as const,
            topic: null,
            unread: false,
            mentionCount: 0,
          },
        ],
      },
    ];

    store.hydrateServers(data);

    expect(store.serverCount()).toBe(1);
    expect(store.serverOf('srv-1')).toEqual({
      id: 'srv-1',
      name: 'Gaming Server',
      iconUrl: null,
      unread: false,
      mentionCount: 0,
    });
    expect(store.channelsOf('srv-1').length).toBe(2);
  });

  it('upsertServerWithChannels thêm mới và cập nhật server thành công', () => {
    store.upsertServerWithChannels(
      { id: 'srv-2', name: 'Study Club', iconUrl: null, unread: false, mentionCount: 0 },
      [{ id: 'c-3', name: 'tailieu', type: 'text', topic: null, unread: false, mentionCount: 0 }],
    );

    expect(store.serverOf('srv-2')?.name).toBe('Study Club');
    expect(store.channelsOf('srv-2').length).toBe(1);

    // Cập nhật tên server
    store.upsertServerWithChannels(
      {
        id: 'srv-2',
        name: 'Study Club VIP',
        iconUrl: 'https://example.com/icon.png',
        unread: true,
        mentionCount: 2,
      },
      [{ id: 'c-3', name: 'tailieu', type: 'text', topic: null, unread: false, mentionCount: 0 }],
    );

    expect(store.serverOf('srv-2')?.name).toBe('Study Club VIP');
    expect(store.serverOf('srv-2')?.unread).toBe(true);
  });

  it('removeServer xóa server và channels khỏi store và reset active state nếu đang mở', () => {
    store.hydrateServers([
      {
        id: 'srv-1',
        name: 'Server 1',
        iconUrl: null,
        channels: [
          { id: 'c-1', name: 'c1', type: 'text', topic: null, unread: false, mentionCount: 0 },
        ],
      },
    ]);

    store.setActive('srv-1', 'c-1');
    expect(store.activeServerId()).toBe('srv-1');

    store.removeServer('srv-1');

    expect(store.serverOf('srv-1')).toBeUndefined();
    expect(store.channelsOf('srv-1')).toEqual([]);
    expect(store.activeServerId()).toBeNull();
    expect(store.activeChannelId()).toBeNull();
  });

  it('addChannel, updateChannel và removeChannel quản lý kênh chuẩn xác', () => {
    store.hydrateServers([{ id: 'srv-1', name: 'Server 1', iconUrl: null, channels: [] }]);

    store.addChannel('srv-1', {
      id: 'c-10',
      name: 'thao-luan',
      type: 'text',
      topic: null,
      unread: false,
      mentionCount: 0,
    });
    expect(store.channelsOf('srv-1').length).toBe(1);

    store.updateChannel('srv-1', {
      id: 'c-10',
      name: 'thao-luan-chung',
      type: 'text',
      topic: 'Topic mới',
      unread: false,
      mentionCount: 0,
    });
    expect(store.channelsOf('srv-1')[0].name).toBe('thao-luan-chung');
    expect(store.channelsOf('srv-1')[0].topic).toBe('Topic mới');

    store.removeChannel('srv-1', 'c-10');
    expect(store.channelsOf('srv-1').length).toBe(0);
  });

  it('moveChannel sắp xếp lại thứ tự kênh trong cùng danh mục và chuyển danh mục khác', () => {
    store.hydrateServers([
      {
        id: 'srv-1',
        name: 'Server 1',
        iconUrl: null,
        channels: [
          {
            id: 'c-1',
            name: 'kênh-1',
            type: 'text',
            topic: null,
            unread: false,
            mentionCount: 0,
            categoryId: 'cat-1',
          },
          {
            id: 'c-2',
            name: 'kênh-2',
            type: 'text',
            topic: null,
            unread: false,
            mentionCount: 0,
            categoryId: 'cat-1',
          },
          {
            id: 'c-3',
            name: 'kênh-3',
            type: 'text',
            topic: null,
            unread: false,
            mentionCount: 0,
            categoryId: 'cat-2',
          },
        ],
      },
    ]);
    store.setCategories('srv-1', [
      { id: 'cat-1', name: 'Nhóm 1' },
      { id: 'cat-2', name: 'Nhóm 2' },
    ]);

    // 1. Đổi chỗ kênh-2 lên trước kênh-1 trong cat-1
    store.moveChannel('srv-1', 'c-2', 'cat-1', 0);
    const updated1 = store.channelsOf('srv-1');
    const cat1Channels = updated1.filter((c) => c.categoryId === 'cat-1');
    expect(cat1Channels[0].id).toBe('c-2');
    expect(cat1Channels[1].id).toBe('c-1');

    // 2. Chuyển kênh-3 từ cat-2 sang cat-1 ở vị trí 1
    store.moveChannel('srv-1', 'c-3', 'cat-1', 1);
    const updated2 = store.channelsOf('srv-1');
    const newCat1Channels = updated2.filter(
      (c) => (c.categoryId ?? store.channelCategories()[c.id]) === 'cat-1',
    );
    expect(newCat1Channels.map((c) => c.id)).toEqual(['c-2', 'c-3', 'c-1']);
    expect(store.getChannelCategory('c-3')).toBe('cat-1');
  });

  describe('Server Groups (Folders) Persistence & Reconcile', () => {
    beforeEach(() => {
      store.setActiveUser('user-test-1');
      store.hydrateServers([
        { id: 'srv-1', name: 'Server 1', iconUrl: null, channels: [] },
        { id: 'srv-2', name: 'Server 2', iconUrl: null, channels: [] },
        { id: 'srv-3', name: 'Server 3', iconUrl: null, channels: [] },
      ]);
    });

    it('groupServers tạo folder mới và lưu vào localStorage phân vùng theo userId', () => {
      const groupId = store.groupServers('srv-1', 'srv-2');
      expect(groupId).toBeTruthy();
      expect(store.serverGroups().length).toBe(1);
      expect(store.serverGroups()[0].serverIds).toEqual(['srv-2', 'srv-1']);

      const raw = localStorage.getItem('nexuscord_server_groups_user-test-1');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(1);
      expect(parsed.groups[0].serverIds).toEqual(['srv-2', 'srv-1']);
    });

    it('thêm server vào group và di chuyển server trong/ngoài group', () => {
      const groupId = store.groupServers('srv-1', 'srv-2')!;
      store.addServerToGroup('srv-3', groupId);
      expect(store.serverGroups()[0].serverIds).toEqual(['srv-2', 'srv-1', 'srv-3']);

      // Di chuyển srv-3 ra ngoài group
      store.moveServerOutsideGroups('srv-3', 0);
      expect(store.serverGroups()[0].serverIds).toEqual(['srv-2', 'srv-1']);

      // Di chuyển srv-1 ra ngoài group -> group còn 1 server -> tự động giải thể group
      store.moveServerOutsideGroups('srv-1', 0);
      expect(store.serverGroups().length).toBe(0);
    });

    it('reconcile tự động loại bỏ serverId không tồn tại và giải thể group <= 1 server', () => {
      // Giả lập localStorage có server 'srv-deleted'
      localStorage.setItem(
        'nexuscord_server_groups_user-test-1',
        JSON.stringify({
          version: 1,
          groups: [{ id: 'grp-legacy', name: 'Old', serverIds: ['srv-1', 'srv-deleted'] }],
        }),
      );

      // Hydrate lại user
      store.setActiveUser('user-test-1');
      // srv-deleted bị loại bỏ, group chỉ còn srv-1 (<= 1) -> giải thể
      expect(store.serverGroups().length).toBe(0);
    });

    it('xử lý an toàn khi localStorage chứa dữ liệu JSON hỏng hoặc schema sai', () => {
      localStorage.setItem('nexuscord_server_groups_user-test-1', 'CORRUPTED_JSON{{{{');
      store.setActiveUser('user-test-1');
      expect(store.serverGroups()).toEqual([]);

      localStorage.setItem(
        'nexuscord_server_groups_user-test-1',
        JSON.stringify({ version: 999, invalid: true }),
      );
      store.setActiveUser('user-test-1');
      expect(store.serverGroups()).toEqual([]);
    });

    it('clear() chỉ reset in-memory state mà KHÔNG xóa localStorage của user vừa logout', () => {
      store.groupServers('srv-1', 'srv-2');
      expect(localStorage.getItem('nexuscord_server_groups_user-test-1')).toBeTruthy();

      store.clear();

      expect(store.servers()).toEqual([]);
      expect(store.serverGroups()).toEqual([]);
      // localStorage vẫn giữ nguyên dữ liệu cho lần đăng nhập sau
      expect(localStorage.getItem('nexuscord_server_groups_user-test-1')).toBeTruthy();
    });

    it('khi chuyển đổi giữa user A và user B thì tách biệt phân vùng dữ liệu nhóm', () => {
      store.setActiveUser('user-a');
      store.hydrateServers([
        { id: 'srv-1', name: 'Server 1', iconUrl: null, channels: [] },
        { id: 'srv-2', name: 'Server 2', iconUrl: null, channels: [] },
      ]);
      store.groupServers('srv-1', 'srv-2');
      expect(store.serverGroups().length).toBe(1);

      // Chuyển sang user B
      store.setActiveUser('user-b');
      store.hydrateServers([{ id: 'srv-1', name: 'Server 1', iconUrl: null, channels: [] }]);
      expect(store.serverGroups()).toEqual([]);

      // User A vẫn còn nguyên trong localStorage
      expect(localStorage.getItem('nexuscord_server_groups_user-a')).toBeTruthy();
      expect(localStorage.getItem('nexuscord_server_groups_user-b')).toBeNull();
    });

    it('bảo toàn categoryId của kênh khi setChannels từ API tải lại', () => {
      store.setActiveUser('user-test-1');
      store.addCategory('srv-1', { id: 'cat-custom', name: 'CUSTOM CAT' });
      store.addChannel('srv-1', {
        id: 'c-voice-1',
        name: 'Thoại Đặc Biệt',
        type: 'voice',
        topic: null,
        unread: false,
        mentionCount: 0,
        categoryId: 'cat-custom',
      });

      expect(store.channelsOf('srv-1')[0].categoryId).toBe('cat-custom');

      // Giả lập WebSocket / API tải lại danh sách kênh thô (không có categoryId từ DB)
      store.setChannels('srv-1', [
        {
          id: 'c-voice-1',
          name: 'Thoại Đặc Biệt',
          type: 'voice',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ]);

      // Phải tự động reconcile và giữ categoryId: 'cat-custom'
      expect(store.channelsOf('srv-1')[0].categoryId).toBe('cat-custom');
    });

    describe('commitServerDrop atomic operations', () => {
      beforeEach(() => {
        store.setActiveUser('user-test-1');
        store.hydrateServers([
          { id: 'srv-1', name: 'Server 1', iconUrl: null, channels: [] },
          { id: 'srv-2', name: 'Server 2', iconUrl: null, channels: [] },
          { id: 'srv-3', name: 'Server 3', iconUrl: null, channels: [] },
          { id: 'srv-4', name: 'Server 4', iconUrl: null, channels: [] },
        ]);
      });

      it('merge-server tạo nhóm mới khi thả server lên server khác', () => {
        const result = store.commitServerDrop({
          kind: 'merge-server',
          sourceServerId: 'srv-1',
          targetServerId: 'srv-2',
        });

        expect(result).not.toBeNull();
        expect(result?.action).toBe('create-group');
        expect(store.serverGroups().length).toBe(1);
        expect(store.serverGroups()[0].serverIds).toContain('srv-1');
        expect(store.serverGroups()[0].serverIds).toContain('srv-2');
      });

      it('merge-server thêm vào nhóm có sẵn nếu targetServerId đã thuộc nhóm', () => {
        store.groupServers('srv-2', 'srv-3');
        const groupId = store.serverGroups()[0].id;

        const result = store.commitServerDrop({
          kind: 'merge-server',
          sourceServerId: 'srv-1',
          targetServerId: 'srv-2',
        });

        expect(result).not.toBeNull();
        expect(result?.action).toBe('add-to-group');
        expect(store.serverGroups().length).toBe(1);
        expect(store.serverGroups()[0].id).toBe(groupId);
        expect(store.serverGroups()[0].serverIds).toContain('srv-1');
        expect(store.serverGroups()[0].serverIds).toContain('srv-2');
        expect(store.serverGroups()[0].serverIds).toContain('srv-3');
      });

      it('insert-group chèn server vào đúng vị trí chỉ định trong nhóm', () => {
        store.groupServers('srv-2', 'srv-3');
        const groupId = store.serverGroups()[0].id;

        const result = store.commitServerDrop({
          kind: 'insert-group',
          sourceServerId: 'srv-1',
          targetGroupId: groupId,
          index: 0,
        });

        expect(result).not.toBeNull();
        expect(result?.action).toBe('add-to-group');
        expect(store.serverGroups()[0].serverIds[0]).toBe('srv-1');
      });

      it('insert-group reorder trong cùng một nhóm', () => {
        store.groupServers('srv-1', 'srv-2');
        store.addServerToGroup('srv-3', store.serverGroups()[0].id);
        const groupId = store.serverGroups()[0].id;

        const result = store.commitServerDrop({
          kind: 'insert-group',
          sourceServerId: 'srv-1',
          targetGroupId: groupId,
          index: 2,
        });

        expect(result).not.toBeNull();
        expect(result?.action).toBe('reorder-group');
      });

      it('detach-to-rail đưa server ra ngoài rail và auto-dissolve nếu group còn <= 1 server', () => {
        store.groupServers('srv-1', 'srv-2');
        expect(store.serverGroups().length).toBe(1);

        const result = store.commitServerDrop({
          kind: 'detach-to-rail',
          sourceServerId: 'srv-1',
          railIndex: 0,
        });

        expect(result).not.toBeNull();
        expect(result?.action).toBe('detach-from-group');
        // Group còn lại srv-2 (<= 1) -> tự động giải tán
        expect(store.serverGroups().length).toBe(0);
      });

      it('trả về null và không mutate state với intent invalid hoặc pending', () => {
        const groupsBefore = store.serverGroups();
        const resNone = store.commitServerDrop({ kind: 'none' });
        expect(resNone).toBeNull();

        const resPending = store.commitServerDrop({
          kind: 'merge-pending',
          sourceServerId: 'srv-1',
          targetId: 'srv-2',
          targetKind: 'server',
          dwellToken: 1,
        });
        expect(resPending).toBeNull();

        const resSelf = store.commitServerDrop({
          kind: 'merge-server',
          sourceServerId: 'srv-1',
          targetServerId: 'srv-1',
        });
        expect(resSelf).toBeNull();
        expect(store.serverGroups()).toEqual(groupsBefore);
      });
    });
  });

  describe('ServerChannelLayout Hierarchy & Persistence Canonical', () => {
    beforeEach(() => {
      store.setActiveUser('user-channel-test');
      store.hydrateServers([
        {
          id: 'srv-hierarchy',
          name: 'Hierarchy Server',
          iconUrl: null,
          channels: [
            {
              id: 'ch-a',
              name: 'channel-a',
              type: 'text',
              topic: null,
              unread: false,
              mentionCount: 0,
              categoryId: 'cat-study',
            },
            {
              id: 'ch-b',
              name: 'channel-b',
              type: 'text',
              topic: null,
              unread: false,
              mentionCount: 0,
              categoryId: 'cat-study',
            },
            {
              id: 'ch-c',
              name: 'channel-c',
              type: 'text',
              topic: null,
              unread: false,
              mentionCount: 0,
              categoryId: 'cat-study',
            },
            {
              id: 'ch-game-1',
              name: 'channel-game-1',
              type: 'text',
              topic: null,
              unread: false,
              mentionCount: 0,
              categoryId: 'cat-game',
            },
            {
              id: 'ch-root-1',
              name: 'kênh-tự-do',
              type: 'text',
              topic: null,
              unread: false,
              mentionCount: 0,
              categoryId: null,
            },
          ],
        },
      ]);
      store.setCategories('srv-hierarchy', [
        { id: 'cat-study', name: 'DANH MỤC HỌC TẬP' },
        { id: 'cat-game', name: 'DANH MỤC GAME' },
      ]);
    });

    it('Scenario A: Trong category có [A, B, C], kéo C lên đầu -> [C, A, B]', () => {
      store.moveChannel('srv-hierarchy', 'ch-c', 'cat-study', 0);

      const layout = store.getServerLayout('srv-hierarchy');
      expect(layout.categoryChannels['cat-study']).toEqual(['ch-c', 'ch-a', 'ch-b']);

      const studyChannels = store
        .channelsOf('srv-hierarchy')
        .filter((c) => c.categoryId === 'cat-study');
      expect(studyChannels.map((c) => c.id)).toEqual(['ch-c', 'ch-a', 'ch-b']);
    });

    it('Scenario B: Category Học tập có [A, B], Category Game có [C]; kéo B vào đầu Game', () => {
      // Setup Học tập có A, B và Game có C
      store.moveChannel('srv-hierarchy', 'ch-c', 'cat-game', 1); // Đưa C sang game
      // Kéo B vào đầu Game (index 0)
      store.moveChannel('srv-hierarchy', 'ch-b', 'cat-game', 0);

      const layout = store.getServerLayout('srv-hierarchy');
      expect(layout.categoryChannels['cat-study']).toEqual(['ch-a']);
      expect(layout.categoryChannels['cat-game']).toEqual(['ch-b', 'ch-game-1', 'ch-c']);
      expect(store.getChannelCategory('ch-b')).toBe('cat-game');
    });

    it('Scenario C: Kéo B khỏi Game và thả trước Category Học tập -> B trở thành root channel', () => {
      // Kéo ch-b thành root channel ở vị trí 0 (trước Category Học tập)
      store.moveChannel('srv-hierarchy', 'ch-b', null, 0, 0);

      const layout = store.getServerLayout('srv-hierarchy');
      expect(layout.rootItems[0]).toEqual({ kind: 'channel', id: 'ch-b' });
      expect(layout.categoryChannels['cat-study']).not.toContain('ch-b');
      expect(layout.categoryChannels['cat-game']).not.toContain('ch-b');
      expect(store.getChannelCategory('ch-b')).toBeUndefined();
    });

    it('Scenario E: Kéo Category Game lên trên Category Học tập -> thứ tự root thay đổi', () => {
      // Kéo cat-game lên vị trí 0
      store.moveCategory('srv-hierarchy', 'cat-game', 0);

      const layout = store.getServerLayout('srv-hierarchy');
      const rootCatIds = layout.rootItems.filter((i) => i.kind === 'category').map((i) => i.id);
      expect(rootCatIds[0]).toBe('cat-game');
      expect(rootCatIds[1]).toBe('cat-study');
    });

    it('Reconcile khi xóa Category: chuyển toàn bộ channel con ra root tại đúng vị trí đó', () => {
      store.removeCategory('srv-hierarchy', 'cat-study');

      const layout = store.getServerLayout('srv-hierarchy');
      expect(layout.categoryChannels['cat-study']).toBeUndefined();

      // Các kênh ch-a, ch-b, ch-c phải nằm trong rootItems
      const rootChannelIds = layout.rootItems.filter((i) => i.kind === 'channel').map((i) => i.id);
      expect(rootChannelIds).toContain('ch-a');
      expect(rootChannelIds).toContain('ch-b');
      expect(rootChannelIds).toContain('ch-c');
    });

    it('không lưu layout theo user và áp dụng structure canonical từ backend cho tài khoản khác', () => {
      store.moveChannel('srv-hierarchy', 'ch-c', 'cat-study', 0);

      const storageKey = 'nexuscord_channel_layout_v1_user-channel-test';
      expect(localStorage.getItem(storageKey)).toBeNull();
      const canonical = store.channelStructureOf('srv-hierarchy');

      // User khác không hydrate layout cá nhân mà nhận cùng structure từ backend/realtime.
      store.setActiveUser('user-other-account');
      expect(store.serverChannelLayouts()['srv-hierarchy']).toBeUndefined();
      store.applyServerChannelStructure('srv-hierarchy', canonical);
      expect(store.getServerLayout('srv-hierarchy').categoryChannels['cat-study']).toEqual([
        'ch-c',
        'ch-a',
        'ch-b',
      ]);
    });
  });
});
