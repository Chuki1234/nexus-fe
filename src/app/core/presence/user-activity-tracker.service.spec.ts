import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { UserActivityTrackerService } from './user-activity-tracker.service';
import { ChatSocketService } from '../realtime/chat-socket.service';

describe('UserActivityTrackerService', () => {
  let service: UserActivityTrackerService;
  let mockChatSocket: { emitActivity: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockChatSocket = {
      emitActivity: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UserActivityTrackerService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ChatSocketService, useValue: mockChatSocket },
      ],
    });

    service = TestBed.inject(UserActivityTrackerService);
  });

  afterEach(() => {
    service.stop();
  });

  it('gọi emitActivity khi start tracking', () => {
    service.start();
    expect(mockChatSocket.emitActivity).toHaveBeenCalledTimes(1);
  });

  it('throttle 30 giây: các tương tác liên tiếp không spam emitActivity', () => {
    service.start();
    expect(mockChatSocket.emitActivity).toHaveBeenCalledTimes(1);

    // Kích hoạt nhiều tương tác liên tiếp trong khoảng vài ms
    service.recordActivity();
    service.recordActivity();
    service.recordActivity();

    // Vẫn chỉ gọi đúng 1 lần do chưa qua 30s
    expect(mockChatSocket.emitActivity).toHaveBeenCalledTimes(1);
  });

  it('khi force=true hoặc qua 30 giây -> gửi emitActivity mới', () => {
    service.start();
    expect(mockChatSocket.emitActivity).toHaveBeenCalledTimes(1);

    service.recordActivity(true);
    expect(mockChatSocket.emitActivity).toHaveBeenCalledTimes(2);
  });

  it('stop dọn dẹp listeners an toàn', () => {
    service.start();
    service.stop();
    // Không ném lỗi khi stop nhiều lần
    service.stop();
  });
});
