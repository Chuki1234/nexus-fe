import { TestBed } from '@angular/core/testing';
import { ServersStore } from './servers.store';

describe('ServersStore', () => {
  let store: ServersStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ServersStore],
    });
    store = TestBed.inject(ServersStore);
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
          { id: 'c-1', name: 'general', type: 'text' as const, topic: null, unread: false, mentionCount: 0 },
          { id: 'c-2', name: 'Voice 1', type: 'voice' as const, topic: null, unread: false, mentionCount: 0 },
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
      { id: 'srv-2', name: 'Study Club VIP', iconUrl: 'https://example.com/icon.png', unread: true, mentionCount: 2 },
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
        channels: [{ id: 'c-1', name: 'c1', type: 'text', topic: null, unread: false, mentionCount: 0 }],
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
    store.hydrateServers([
      { id: 'srv-1', name: 'Server 1', iconUrl: null, channels: [] },
    ]);

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
});
