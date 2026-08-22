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
    sendRequest: ReturnType<typeof vi.fn>;
    acceptRequest: ReturnType<typeof vi.fn>;
    deleteRequest: ReturnType<typeof vi.fn>;
    removeFriend: ReturnType<typeof vi.fn>;
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
      sendRequest: vi.fn(),
      acceptRequest: vi.fn(),
      deleteRequest: vi.fn().mockResolvedValue(undefined),
      removeFriend: vi.fn().mockResolvedValue(undefined),
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
});
