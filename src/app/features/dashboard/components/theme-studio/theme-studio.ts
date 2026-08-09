import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import {
  DASHBOARD_ATMOSPHERES,
  type DashboardAtmosphere,
} from '../../services/dashboard-appearance';

@Component({
  selector: 'app-theme-studio',
  imports: [MatIconModule, MatRippleModule],
  templateUrl: './theme-studio.html',
  styleUrl: './theme-studio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeStudio {
  readonly selected = input.required<DashboardAtmosphere>();
  readonly selectedChange = output<DashboardAtmosphere>();

  protected readonly options = DASHBOARD_ATMOSPHERES;

  protected select(atmosphere: DashboardAtmosphere): void {
    if (atmosphere !== this.selected()) {
      this.selectedChange.emit(atmosphere);
    }
  }
}
