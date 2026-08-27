import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionStateCoordinator } from './core/auth/session-state-coordinator.service';
import { NexusBoot } from './features/dashboard/components/nexus-boot/nexus-boot';
import { NexusBootState } from './features/dashboard/services/nexus-boot-state';
import { NotificationToast } from './shared/ui/notification-toast/notification-toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NexusBoot, RouterOutlet, NotificationToast],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly boot = inject(NexusBootState);
  private readonly sessionCoordinator = inject(SessionStateCoordinator);
}
