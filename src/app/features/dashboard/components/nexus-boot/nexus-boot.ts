import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-nexus-boot',
  imports: [],
  templateUrl: './nexus-boot.html',
  styleUrl: './nexus-boot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NexusBoot {
  readonly leaving = input(false);
}
