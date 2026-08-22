import { ShellData } from './shell-data';

describe('ShellData demo mode', () => {
  it('mặc định giữ đúng trạng thái tài khoản mới rỗng của UI-3', () => {
    const shell = new ShellData();

    expect(shell.demoEnabled()).toBe(false);
    expect(shell.servers()).toEqual([]);
    expect(shell.serverGroups()).toEqual([]);
    expect(shell.channelsOf('lofi')).toEqual([]);
    expect(shell.conversations()).toEqual([]);
    expect(shell.totalMentions()).toBe(0);
  });

  it('bật demo thì cùng lúc có server, group, channel, DM và mention', () => {
    const shell = new ShellData();

    shell.setDemoEnabled(true);

    expect(shell.demoEnabled()).toBe(true);
    expect(shell.servers().map((server) => server.id)).toEqual(['lofi', 'xp', 'itss', 'peak']);
    expect(shell.serverGroups()).toEqual([
      { id: 'study', name: 'Học tập', serverIds: ['lofi', 'itss'] },
    ]);
    expect(shell.channelsOf('lofi').map((channel) => channel.id)).toEqual([
      'chung',
      'nhac',
      'phong-hop',
    ]);
    expect(shell.conversations().length).toBe(6);
    expect(shell.totalMentions()).toBe(1);
    expect(shell.serverOf('itss')?.name).toBe('ITSS Lab');
    expect(shell.channelOf('itss', 'do-an')?.name).toBe('đồ-án');
    expect(shell.conversationOf('mon')?.name).toBe('Phan Thế Mon');
  });

  it('toggle lần nữa trả toàn bộ shell về dữ liệu live rỗng', () => {
    const shell = new ShellData();

    shell.toggleDemoData();
    expect(shell.demoEnabled()).toBe(true);

    shell.toggleDemoData();

    expect(shell.demoEnabled()).toBe(false);
    expect(shell.servers()).toEqual([]);
    expect(shell.channelsOf('lofi')).toEqual([]);
    expect(shell.conversations()).toEqual([]);
  });

  it('kéo hai server rời tạo group mới mà không làm mất group demo cũ', () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);

    const groupId = shell.groupServers('xp', 'peak');

    expect(groupId).toBe('group-peak-xp');
    expect(shell.serverGroups()).toHaveLength(2);
    expect(shell.servers().map((server) => server.id)).toEqual(['lofi', 'itss', 'peak', 'xp']);
    expect(shell.serverGroups().find((group) => group.serverIds.includes('xp'))?.serverIds).toEqual(
      ['peak', 'xp'],
    );
  });

  it('move server vào group khác không duplicate và tự rã group còn một member', () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    shell.groupServers('xp', 'peak');
    const target = shell.serverGroups().find((group) => group.serverIds.includes('xp'))!;

    shell.addServerToGroup('lofi', target.id);

    expect(shell.serverGroups()).toHaveLength(1);
    expect(shell.serverGroups()[0].serverIds).toEqual(['peak', 'xp', 'lofi']);
    expect(new Set(shell.serverGroups()[0].serverIds).size).toBe(3);

    shell.addServerToGroup('lofi', target.id);
    expect(shell.serverGroups()[0].serverIds).toEqual(['peak', 'xp', 'lofi']);
  });

  it('kéo server ra ngoài group đặt đúng drop slot và tự giải phóng group còn một member', () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);

    shell.moveServerOutsideGroups('lofi', 1);

    expect(shell.serverGroups()).toEqual([]);
    expect(shell.servers().map((server) => server.id)).toEqual(['itss', 'lofi', 'xp', 'peak']);
  });

  it('reorder server ngoài group theo đúng insertion index mà không duplicate', () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);

    shell.moveServerOutsideGroups('peak', 0);

    expect(shell.servers().map((server) => server.id)).toEqual(['peak', 'lofi', 'itss', 'xp']);
    expect(new Set(shell.servers().map((server) => server.id)).size).toBe(4);
    expect(shell.serverGroups()[0].serverIds).toEqual(['lofi', 'itss']);
  });

  it('reorder server trong group theo drop slot và giữ nguyên membership', () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);

    shell.moveServerToGroup('itss', 'study', 0);

    expect(shell.serverGroups()).toEqual([
      { id: 'study', name: 'Học tập', serverIds: ['itss', 'lofi'] },
    ]);
  });

  it('move server từ ngoài vào giữa group theo drop slot', () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);

    shell.moveServerToGroup('xp', 'study', 1);

    expect(shell.serverGroups()[0].serverIds).toEqual(['lofi', 'xp', 'itss']);
    expect(new Set(shell.serverGroups()[0].serverIds).size).toBe(3);
  });

  it('hydrateServers nạp danh sách server và channels vào live state', () => {
    const shell = new ShellData();

    shell.hydrateServers([
      {
        id: 's-1',
        name: 'Máy chủ thật',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
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
      },
    ]);

    expect(shell.servers()).toEqual([
      {
        id: 's-1',
        name: 'Máy chủ thật',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
      },
    ]);
    expect(shell.channelsOf('s-1')).toEqual([
      {
        id: 'c-1',
        name: 'chung',
        type: 'text',
        topic: null,
        unread: false,
        mentionCount: 0,
      },
    ]);
  });

  it('upsertServerWithChannels thêm server mới vào live state', () => {
    const shell = new ShellData();

    shell.upsertServerWithChannels(
      {
        id: 's-new',
        name: 'Máy chủ mới',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
      },
      [
        {
          id: 'c-new',
          name: 'chung',
          type: 'text',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
    );

    expect(shell.servers()).toEqual([
      {
        id: 's-new',
        name: 'Máy chủ mới',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
      },
    ]);
    expect(shell.channelsOf('s-new')).toEqual([
      {
        id: 'c-new',
        name: 'chung',
        type: 'text',
        topic: null,
        unread: false,
        mentionCount: 0,
      },
    ]);
  });

  it('addChannel thêm kênh mới vào server và cập nhật kênh trùng id', () => {
    const shell = new ShellData();

    shell.addChannel('s-1', {
      id: 'c-1',
      name: 'kênh-1',
      type: 'text',
      topic: null,
      unread: false,
      mentionCount: 0,
    });

    expect(shell.channelsOf('s-1')).toHaveLength(1);
    expect(shell.channelsOf('s-1')[0].name).toBe('kênh-1');

    // Thêm kênh thứ hai
    shell.addChannel('s-1', {
      id: 'c-2',
      name: 'Phòng họp',
      type: 'voice',
      topic: null,
      unread: false,
      mentionCount: 0,
    });

    expect(shell.channelsOf('s-1')).toHaveLength(2);

    // Cập nhật kênh đã có
    shell.addChannel('s-1', {
      id: 'c-1',
      name: 'kênh-1-đổi-tên',
      type: 'text',
      topic: 'Chủ đề mới',
      unread: true,
      mentionCount: 2,
    });

    expect(shell.channelsOf('s-1')).toHaveLength(2);
    expect(shell.channelsOf('s-1')[0].name).toBe('kênh-1-đổi-tên');
    expect(shell.channelsOf('s-1')[0].unread).toBe(true);
  });
});
