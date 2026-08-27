import { TestBed } from '@angular/core/testing';
import {
  FriendsApi,
  type FriendRequestResponse,
  type FriendResponse,
} from './friends-api';
import { FriendsStore } from './friends-store';

describe('FriendsStore', () => {
  let service: FriendsStore;
  let api: {
    listFriends: ReturnType<typeof vi.fn>;
    listRequests: ReturnType<typeof vi.fn>;
    listBlocked: ReturnType<typeof vi.fn>;
    sendRequest: ReturnType<typeof vi.fn>;
    acceptRequest: ReturnType<typeof vi.fn>;
    deleteRequest: ReturnType<typeof vi.fn>;
    removeFriend: ReturnType<typeof vi.fn>;
    blockUser: ReturnType<typeof vi.fn>;
    unblockUser: ReturnType<typeof vi.fn>;
  };

  const friend = (
    id: string,
    username: string,
    displayName: string | null = null,
  ): FriendResponse => ({
    id,
    username,
    displayName,
    avatarUrl: null,
    statusMessage: null,
    presence: 'online',
    friendsSince: '2026-08-22T00:00:00.000Z',
  });

  const request = (
    id: string,
    username: string,
  ): FriendRequestResponse => ({
    id,
    username,
    displayName: null,
    avatarUrl: null,
    statusMessage: null,
    presence: 'offline',
    requestedAt: '2026-08-22T00:00:00.000Z',
  });

  beforeEach(() => {
    api = {
      listFriends: vi.fn().mockResolvedValue([]),
      listRequests: vi.fn().mockResolvedValue({
        incoming: [],
        outgoing: [],
      }),
      listBlocked: vi.fn().mockResolvedValue([]),
      sendRequest: vi.fn(),
      acceptRequest: vi.fn(),
      deleteRequest: vi.fn().mockResolvedValue(undefined),
      removeFriend: vi.fn().mockResolvedValue(undefined),
      blockUser: vi.fn(),
      unblockUser: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: FriendsApi, useValue: api }],
    });
    service = TestBed.inject(FriendsStore);
  });

  it('nạp bạn bè và tách đúng lời mời đến/đi từ API thật', async () => {
    api.listFriends.mockResolvedValue([
      friend('friend-1', 'mai.nguyen', 'Mai Nguyễn'),
    ]);
    api.listRequests.mockResolvedValue({
      incoming: [request('incoming-1', 'loc.nguyen')],
      outgoing: [request('outgoing-1', 'will.test')],
    });

    await service.load();

    expect(service.friends().map((person) => person.name)).toEqual([
      'Mai Nguyễn',
    ]);
    expect(service.incomingRequests()[0]).toMatchObject({
      id: 'incoming-1',
      direction: 'incoming',
    });
    expect(service.outgoingRequests()[0]).toMatchObject({
      id: 'outgoing-1',
      direction: 'outgoing',
    });
  });

  it('không gửi trùng khi thao tác gửi trước vẫn đang chờ', async () => {
    let resolveRequest!: (value: FriendRequestResponse) => void;
    api.sendRequest.mockReturnValue(
      new Promise<FriendRequestResponse>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = service.sendRequest('will.test');
    const second = await service.sendRequest('will.test');

    expect(second).toBe(false);
    expect(api.sendRequest).toHaveBeenCalledTimes(1);

    resolveRequest(request('outgoing-1', 'will.test'));
    await expect(first).resolves.toBe(true);
    expect(service.outgoingRequests()[0].username).toBe('will.test');
    expect(service.feedback()).toContain('@will.test');
  });

  it('chấp nhận lời mời sẽ chuyển người đó sang danh sách bạn bè', async () => {
    api.listRequests.mockResolvedValue({
      incoming: [request('incoming-1', 'loc.nguyen')],
      outgoing: [],
    });
    api.acceptRequest.mockResolvedValue(
      friend('incoming-1', 'loc.nguyen', 'Lộc Nguyễn'),
    );
    await service.load();

    await service.acceptRequest('incoming-1');

    expect(service.incomingRequests()).toHaveLength(0);
    expect(service.friends()[0]).toMatchObject({
      id: 'incoming-1',
      name: 'Lộc Nguyễn',
    });
    expect(service.busyIds().has('incoming-1')).toBe(false);
  });

  it('từ chối hoặc hủy lời mời chỉ xóa khỏi đúng nhóm', async () => {
    api.listRequests.mockResolvedValue({
      incoming: [request('incoming-1', 'loc.nguyen')],
      outgoing: [request('outgoing-1', 'will.test')],
    });
    await service.load();

    await service.deleteRequest('incoming-1', 'incoming');
    expect(service.incomingRequests()).toHaveLength(0);
    expect(service.outgoingRequests()).toHaveLength(1);

    await service.deleteRequest('outgoing-1', 'outgoing');
    expect(service.outgoingRequests()).toHaveLength(0);
    expect(api.deleteRequest).toHaveBeenCalledTimes(2);
  });

  it('xóa bạn cập nhật ngay danh sách cục bộ', async () => {
    api.listFriends.mockResolvedValue([
      friend('friend-1', 'mai.nguyen', 'Mai Nguyễn'),
    ]);
    await service.load();

    await service.removeFriend('friend-1');

    expect(api.removeFriend).toHaveBeenCalledWith('friend-1');
    expect(service.friends()).toHaveLength(0);
    expect(service.feedback()).toBe(
      'Đã xóa người dùng khỏi danh sách bạn bè.',
    );
  });

  describe('Blocked Users & Session Isolation', () => {
    it('loadBlocked nạp danh sách bị chặn từ API', async () => {
      api.listBlocked.mockResolvedValue([
        {
          id: 'user-b',
          username: 'user_b',
          displayName: 'User B',
          avatarUrl: null,
          blockedAt: '2026-08-22T00:00:00.000Z',
        },
      ]);

      await service.loadBlocked();

      expect(service.blocked()).toHaveLength(1);
      expect(service.blocked()[0].username).toBe('user_b');
      expect(service.isBlocked('user-b')).toBe(true);
      expect(service.isBlocked('user-c')).toBe(false);
    });

    it('blockUser thực hiện optimistic update: xóa bạn bè, thêm vào blocked và rollback nếu API lỗi', async () => {
      api.listFriends.mockResolvedValue([
        friend('user-b', 'user_b', 'User B'),
      ]);
      await service.load();
      expect(service.friends()).toHaveLength(1);

      // Thất bại -> rollback
      api.blockUser.mockRejectedValueOnce(new Error('Network error'));
      const failResult = await service.blockUser('user-b');
      expect(failResult).toBeNull();
      expect(service.friends()).toHaveLength(1);
      expect(service.blocked()).toHaveLength(0);

      // Thành công -> cập nhật
      const blockedDto = {
        id: 'user-b',
        username: 'user_b',
        displayName: 'User B',
        avatarUrl: null,
        blockedAt: '2026-08-22T00:00:00.000Z',
      };
      api.blockUser.mockResolvedValueOnce(blockedDto);
      const successResult = await service.blockUser('user-b');
      expect(successResult).toEqual(blockedDto);
      expect(service.friends()).toHaveLength(0);
      expect(service.blocked()).toHaveLength(1);
      expect(service.isBlocked('user-b')).toBe(true);
    });

    it('unblockUser thực hiện optimistic update: xóa khỏi blocked và rollback nếu API lỗi', async () => {
      api.listBlocked.mockResolvedValue([
        {
          id: 'user-b',
          username: 'user_b',
          displayName: 'User B',
          avatarUrl: null,
          blockedAt: '2026-08-22T00:00:00.000Z',
        },
      ]);
      await service.loadBlocked();
      expect(service.blocked()).toHaveLength(1);

      // Thất bại -> rollback
      api.unblockUser.mockRejectedValueOnce(new Error('Server error'));
      const failResult = await service.unblockUser('user-b');
      expect(failResult).toBe(false);
      expect(service.blocked()).toHaveLength(1);

      // Thành công
      api.unblockUser.mockResolvedValueOnce(undefined);
      const successResult = await service.unblockUser('user-b');
      expect(successResult).toBe(true);
      expect(service.blocked()).toHaveLength(0);
      expect(service.isBlocked('user-b')).toBe(false);
    });

    it('clear() dọn sạch toàn bộ store khi đổi tài khoản / đăng xuất', async () => {
      api.listFriends.mockResolvedValue([
        friend('friend-1', 'mai.nguyen', 'Mai Nguyễn'),
      ]);
      api.listBlocked.mockResolvedValue([
        {
          id: 'user-b',
          username: 'user_b',
          displayName: 'User B',
          avatarUrl: null,
          blockedAt: '2026-08-22T00:00:00.000Z',
        },
      ]);
      await service.load();
      await service.loadBlocked();

      expect(service.friends()).toHaveLength(1);
      expect(service.blocked()).toHaveLength(1);

      service.clear();

      expect(service.friends()).toHaveLength(0);
      expect(service.incomingRequests()).toHaveLength(0);
      expect(service.outgoingRequests()).toHaveLength(0);
      expect(service.blocked()).toHaveLength(0);
      expect(service.loading()).toBe(false);
      expect(service.loadingBlocked()).toBe(false);
      expect(service.invalidatedRelationshipIds().size).toBe(0);
    });

    it('sessionGeneration ngăn async response của tài khoản cũ ghi đè state sau khi clear()', async () => {
      let resolveLoadFriends!: (val: FriendResponse[]) => void;
      api.listFriends.mockReturnValue(
        new Promise((resolve) => {
          resolveLoadFriends = resolve;
        }),
      );

      // Bắt đầu load ở session 1
      const loadPromise = service.load(true);

      // Đăng xuất / chuyển tài khoản ngay sau đó
      service.clear();

      // Phản hồi của session 1 trả về sau khi đã clear
      resolveLoadFriends([friend('old-friend', 'old.user', 'Old User')]);
      await loadPromise;

      // Danh sách bạn bè vẫn phải rỗng, không bị response cũ làm bẩn state
      expect(service.friends()).toHaveLength(0);
    });

    it('xử lý realtime socket events chính xác và quản lý invalidatedRelationshipIds', async () => {
      const blockedDto = {
        id: 'user-x',
        username: 'user_x',
        displayName: 'User X',
        avatarUrl: null,
        blockedAt: '2026-08-22T00:00:00.000Z',
      };

      // 1. user:block-created
      service.handleUserBlockCreated(blockedDto);
      expect(service.isBlocked('user-x')).toBe(true);

      // 2. user:block-removed
      service.handleUserBlockRemoved({ userId: 'user-x' });
      expect(service.isBlocked('user-x')).toBe(false);

      // 3. relationship:invalidated
      service.handleRelationshipInvalidated({ userId: 'user-y' });
      expect(service.friends().some((f) => f.id === 'user-y')).toBe(false);
      expect(service.isRelationshipInvalidated('user-y')).toBe(true);

      // 4. Kết bạn lại thành công thì xóa khỏi invalidatedRelationshipIds
      api.acceptRequest.mockResolvedValueOnce(friend('user-y', 'user_y', 'User Y'));
      await service.acceptRequest('user-y');
      expect(service.isRelationshipInvalidated('user-y')).toBe(false);
    });

    it('load() tự động gỡ các ID đã trở thành bạn khỏi invalidatedRelationshipIds (phía gửi request được accept)', async () => {
      service.handleRelationshipInvalidated({ userId: 'user-z' });
      expect(service.isRelationshipInvalidated('user-z')).toBe(true);

      api.listFriends.mockResolvedValueOnce([
        friend('user-z', 'user_z', 'User Z'),
      ]);

      await service.load(true);

      expect(service.friends()).toHaveLength(1);
      expect(service.friends()[0].id).toBe('user-z');
      expect(service.isRelationshipInvalidated('user-z')).toBe(false);
    });
  });
});

