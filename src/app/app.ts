import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NexusBoot } from './features/dashboard/components/nexus-boot/nexus-boot';
import { NexusBootState } from './features/dashboard/services/nexus-boot-state';

@Component({
  selector: 'app-root',
  imports: [NexusBoot, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly boot = inject(NexusBootState);
}
