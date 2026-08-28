import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { UserSettingsService } from '../../services/user-settings.service';
import { ServerAccessTab } from './server-access-tab';

describe('ServerAccessTab', () => {
  it('không hiển thị giới hạn độ tuổi máy chủ khi tính năng chưa được phát hành', async () => {
    const currentServerData = signal({
      accessSettings: {
        joinMode: 'invite-only' as const,
        ageRestricted: false,
        rulesAgreement: false,
        rulesList: [],
      },
    });

    await TestBed.configureTestingModule({
      imports: [ServerAccessTab],
      providers: [
        {
          provide: UserSettingsService,
          useValue: {
            currentServerData,
            updateServerAccessSettings: vi.fn(),
            addServerRule: vi.fn(),
            deleteServerRule: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerAccessTab);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Máy Chủ Giới Hạn Độ Tuổi');
    expect(fixture.nativeElement.querySelector('[aria-label="Máy Chủ Giới Hạn Độ Tuổi"]')).toBeNull();
  });
});
