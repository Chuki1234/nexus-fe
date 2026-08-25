import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-landing-quote',
  imports: [],
  templateUrl: './landing-quote.html',
  styleUrl: './landing-quote.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingQuote {}
