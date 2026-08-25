import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingMascot } from '../landing-mascot/landing-mascot';

@Component({
  selector: 'app-landing-cta',
  imports: [RouterLink, LandingMascot],
  templateUrl: './landing-cta.html',
  styleUrl: './landing-cta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingCta {}
