import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  formatFriendsApiError,
  FriendsApi,
  type FriendProfileResponse,
  type FriendRequestResponse,
  type FriendResponse,
} from './friends-api';

describe('FriendsApi', () => {
  let service: FriendsApi;
  let http: HttpTestingController;
  const token = signal<string | null>('friend-token');

  const profile: FriendProfileResponse = {
    id: 'user-2',
    username: 'will.test',
    displayName: 'Will Test',
    avatarUrl: null,
    statusMessage: null,
    presence: 'online',
  };

  beforeEach(() => {
    token.set('friend-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { accessToken: token.asReadonly() },
        },
      ],
    });
    service = TestBed.inject(FriendsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('đọc danh sách bạn bè và gắn bearer token', async () => {
    const response: FriendResponse[] = [
      { ...profile, friendsSince: '2026-08-22T00:00:00.000Z' },
    ];
    const pending = service.listFriends();
    const request = http.expectOne(`${environment.apiUrl}/friends`);

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer friend-token',
    );
    request.flush(response);

    await expect(pending).resolves.toEqual(response);
  });

  it('chuẩn hóa username trước khi gửi lời mời', async () => {
    const response: FriendRequestResponse = {
      ...profile,
      requestedAt: '2026-08-22T00:00:00.000Z',
    };
    const pending = service.sendRequest('  Will.Test  ');
    const request = http.expectOne(`${environment.apiUrl}/friends/requests`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'will.test' });
    request.flush(response);

    await expect(pending).resolves.toEqual(response);
  });

  it('gọi đúng endpoint chấp nhận, xóa lời mời và xóa bạn', async () => {
    const accepted = service.acceptRequest('user-2');
    const acceptRequest = http.expectOne(
      `${environment.apiUrl}/friends/requests/user-2/accept`,
    );
    expect(acceptRequest.request.method).toBe('PATCH');
    acceptRequest.flush({
      ...profile,
      friendsSince: '2026-08-22T00:00:00.000Z',
    });
    await accepted;

    const deletedRequest = service.deleteRequest('user-2');
    const deleteRequest = http.expectOne(
      `${environment.apiUrl}/friends/requests/user-2`,
    );
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
    await deletedRequest;

    const removed = service.removeFriend('user-2');
    const removeRequest = http.expectOne(
      `${environment.apiUrl}/friends/user-2`,
    );
    expect(removeRequest.request.method).toBe('DELETE');
    removeRequest.flush(null);
    await removed;
  });

  it('chặn request khi phiên đăng nhập không có access token', () => {
    token.set(null);

    expect(() => service.listFriends()).toThrowError(
      'Bạn cần đăng nhập để sử dụng tính năng kết bạn.',
    );
  });

  it('ưu tiên thông báo lỗi có nghĩa từ backend', () => {
    expect(
      formatFriendsApiError(
        new Error('Tên người dùng này không tồn tại.'),
      ),
    ).toBe('Tên người dùng này không tồn tại.');
  });
});
