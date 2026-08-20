import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-games-tab',
  imports: [MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './games-tab.html',
  styleUrl: './games-tab.css',
})
export class GamesTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly isAddingGame = signal<boolean>(false);

  protected toggleAutoDetect(checked: boolean): void {
    this.settingsService.updatePreference('autoDetectGames', checked);
  }
}
