import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-server-safety-tab',
  imports: [MatIconModule, MatSlideToggleModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-safety-tab.html',
  styleUrl: './server-safety-tab.css',
})
export class ServerSafetyTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly requireApproval = signal<boolean>(true);
  protected readonly verificationLevel = signal<'none' | 'low' | 'medium' | 'high'>('medium');

  protected setVerification(level: 'none' | 'low' | 'medium' | 'high'): void {
    this.verificationLevel.set(level);
  }

  protected approve(id: string): void {
    this.settingsService.approveJoinRequest(id);
  }

  protected reject(id: string): void {
    this.settingsService.rejectJoinRequest(id);
  }
}
