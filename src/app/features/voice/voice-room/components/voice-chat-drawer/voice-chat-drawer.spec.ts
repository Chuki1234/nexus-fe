import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChannelSummary } from '../../../../../core/api/shell-data';
import { ProfileService } from '../../../../../core/profile/profile.service';
import { VoiceChatDrawer } from './voice-chat-drawer';

describe('VoiceChatDrawer', () => {
  let component: VoiceChatDrawer;
  let fixture: ComponentFixture<VoiceChatDrawer>;
  let mockProfile: { current: ReturnType<typeof vi.fn> };

  const mockChannel: ChannelSummary = {
    id: 'chn-v-1',
    name: 'Phòng chờ',
    type: 'voice',
    topic: null,
    unread: false,
    mentionCount: 0,
  };

  beforeEach(async () => {
    mockProfile = {
      current: vi.fn().mockReturnValue({ displayName: 'Minh Tài' }),
    };

    await TestBed.configureTestingModule({
      imports: [VoiceChatDrawer],
      providers: [
        { provide: ProfileService, useValue: mockProfile },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceChatDrawer);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('channel', mockChannel);
    fixture.detectChanges();
  });

  it('phải được tạo thành công và render tiêu đề kênh', () => {
    expect(component).toBeDefined();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('#Phòng chờ');
  });

  it('gửi tin nhắn mới vào danh sách tin nhắn', () => {
    component.messageText.set('Chào anh em!');
    component['sendMessage']();
    fixture.detectChanges();

    const lastMsg = component.messages().at(-1);
    expect(lastMsg?.content).toBe('Chào anh em!');
    expect(lastMsg?.author).toBe('Minh Tài');
  });
});
