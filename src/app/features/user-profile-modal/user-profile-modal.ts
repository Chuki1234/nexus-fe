import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileTab } from '../settings/tabs/profile-tab/profile-tab';
import { UserSettingsService } from '../settings/services/user-settings.service';

@Component({
  selector: 'app-user-profile-modal',
  standalone: true,
  imports: [MatIconModule, ProfileTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-profile-modal.html',
  styleUrl: './user-profile-modal.css',
})
export class UserProfileModal {
  protected readonly settingsService = inject(UserSettingsService);
  readonly close = output<void>();

  protected onSaveAndClose(): void {
    this.close.emit();
  }
}
