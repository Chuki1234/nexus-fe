import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-nav',
  imports: [RouterLink],
  templateUrl: './landing-nav.html',
  styleUrl: './landing-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingNav {
  /** Neo tới các section CÓ THẬT trên trang (khớp id trong template mỗi section). */
  protected readonly links = [
    { label: 'Tính năng', href: '#journey' },
    { label: 'Chi tiết', href: '#chi-tiet' },
    { label: 'Cộng đồng', href: '#community' },
  ];
}
