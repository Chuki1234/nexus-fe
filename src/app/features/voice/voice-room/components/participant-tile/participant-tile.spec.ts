import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VoiceParticipantModel } from '../../../services/voice-room.service';
import { ParticipantTile } from './participant-tile';

describe('ParticipantTile', () => {
  let component: ParticipantTile;
  let fixture: ComponentFixture<ParticipantTile>;

  const mockParticipant: VoiceParticipantModel = {
    identity: 'usr-1',
    name: 'Minh Tài',
    isLocal: true,
    isSpeaking: false,
    isMuted: false,
    isCameraOn: false,
    isScreenSharing: false,
    connectionQuality: 'excellent',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipantTile],
    }).compileComponents();

    fixture = TestBed.createComponent(ParticipantTile);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('participant', mockParticipant);
    fixture.detectChanges();
  });

  it('phải được tạo thành công và render tên người tham gia', () => {
    expect(component).toBeDefined();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Minh Tài');
    expect(el.textContent).toContain('Bạn');
  });

  it('thêm class participant-tile--speaking khi người tham gia đang nói', () => {
    fixture.componentRef.setInput('participant', {
      ...mockParticipant,
      isSpeaking: true,
    });
    fixture.detectChanges();

    const tile = fixture.nativeElement.querySelector('.participant-tile');
    expect(tile?.classList.contains('participant-tile--speaking')).toBe(true);
  });

  it('hiển thị badge LIVE và phát sự kiện watchStream khi là stream tile chia sẻ màn hình', () => {
    let emittedIdentity = '';
    component.watchStream.subscribe((id: string) => {
      emittedIdentity = id;
    });

    fixture.componentRef.setInput('participant', {
      ...mockParticipant,
      isScreenSharing: true,
    });
    fixture.componentRef.setInput('isScreenShare', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('LIVE');
    expect(el.textContent).toContain('Màn hình');

    const watchOverlay = el.querySelector('.watch-stream-overlay') as HTMLElement;
    expect(watchOverlay).toBeTruthy();
    watchOverlay.click();
    expect(emittedIdentity).toBe('usr-1');
  });

  it('ẩn nút xem stream và overlay khi ở chế độ isFocused', () => {
    fixture.componentRef.setInput('participant', {
      ...mockParticipant,
      isScreenSharing: true,
    });
    fixture.componentRef.setInput('isScreenShare', true);
    fixture.componentRef.setInput('isFocused', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.watch-stream-overlay')).toBeNull();
    expect(el.querySelector('.participant-tile--focused')).toBeTruthy();
  });
});
