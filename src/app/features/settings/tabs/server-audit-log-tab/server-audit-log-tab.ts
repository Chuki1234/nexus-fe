import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-server-audit-log-tab',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-audit-log-tab.html',
  styleUrl: './server-audit-log-tab.css',
})
export class ServerAuditLogTab {
  protected readonly settingsService = inject(UserSettingsService);
}
