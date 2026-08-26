import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-landing-logos',
  imports: [],
  templateUrl: './landing-logos.html',
  styleUrl: './landing-logos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingLogos {
  /** Wordmark cộng đồng giả — thay bằng logo thật ở pha sau. */
  protected readonly communities = [
    'DevViệt',
    'GameHub',
    'Design Circle',
    'OpenSource.vn',
    'Startup Lab',
    'Study Group',
  ];
}
