import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';

export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-connections-tab',
  imports: [MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connections-tab.html',
  styleUrl: './connections-tab.css',
})
export class ConnectionsTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly connectingModalPlatform = signal<Platform | null>(null);

  protected readonly availablePlatforms: Platform[] = [
    { id: 'steam', name: 'Steam', icon: 'sports_esports', color: '#171a21' },
    { id: 'github', name: 'GitHub', icon: 'code', color: '#24292e' },
    { id: 'spotify', name: 'Spotify', icon: 'music_note', color: '#1db954' },
    { id: 'youtube', name: 'YouTube', icon: 'smart_display', color: '#ff0000' },
    { id: 'twitch', name: 'Twitch', icon: 'live_tv', color: '#9146ff' },
    { id: 'xbox', name: 'Xbox', icon: 'sports_esports', color: '#107c10' },
    { id: 'playstation', name: 'PlayStation', icon: 'gamepad', color: '#003791' },
    { id: 'reddit', name: 'Reddit', icon: 'forum', color: '#ff4500' },
  ];

  protected isConnected(id: string): boolean {
    return this.settingsService.connectedAccounts().some((acc) => acc.id === id);
  }

  protected handleConnectClick(p: Platform): void {
    if (this.isConnected(p.id)) return;
    this.connectingModalPlatform.set(p);
  }

  protected confirmConnect(): void {
    const p = this.connectingModalPlatform();
    if (p) {
      this.settingsService.connectAccount(p.id, p.name, p.icon, p.color);
      this.connectingModalPlatform.set(null);
    }
  }

  protected cancelConnect(): void {
    this.connectingModalPlatform.set(null);
  }

  protected disconnect(id: string): void {
    this.settingsService.disconnectAccount(id);
  }
}
