import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { VoiceApiService } from './voice-api.service';

describe('VoiceApiService', () => {
  let service: VoiceApiService;
  let mockAuth: { session: ReturnType<typeof vi.fn>; accessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuth = {
      session: vi.fn().mockReturnValue({ access_token: 'fake-jwt-token' }),
      accessToken: vi.fn().mockReturnValue('fake-jwt-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        VoiceApiService,
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    service = TestBed.inject(VoiceApiService);
  });

  it('phải được khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  it('gọi fetch đúng endpoint và trả về VoiceTokenResponse khi thành công', async () => {
    const mockResponse = {
      serverUrl: 'wss://livekit.example.com',
      participantToken: 'livekit.token.jwt',
      roomName: 'nexus:srv-1:voice:chn-1',
      participantIdentity: 'usr-1',
      participantName: 'Minh Tài',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response);

    const res = await service.getVoiceToken('srv-1', 'chn-1', 'Minh Tài');

    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/api/voice/channels/chn-1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-jwt-token',
      },
      body: JSON.stringify({
        serverId: 'srv-1',
        channelId: 'chn-1',
        displayName: 'Minh Tài',
      }),
    });
    expect(res).toEqual(mockResponse);
  });

  it('quăng lỗi khi fetch response không ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ message: 'LiveKit chưa cấu hình' }),
    } as unknown as Response);

    await expect(service.getVoiceToken('srv-1', 'chn-1')).rejects.toThrow('LiveKit chưa cấu hình');
  });
});
