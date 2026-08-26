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
  protected readonly links = [
    { label: 'Tính năng', href: '#features' },
    { label: 'Thời gian thực', href: '#realtime' },
    { label: 'Bảo mật', href: '#security' },
    { label: 'Cộng đồng', href: '#community' },
  ];
}
