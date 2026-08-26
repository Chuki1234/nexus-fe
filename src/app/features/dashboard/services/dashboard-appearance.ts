import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type DashboardAtmosphere = 'hybrid' | 'sage' | 'apricot' | 'lilac' | 'lagoon' | 'midnight';

export interface DashboardAtmosphereOption {
  readonly id: DashboardAtmosphere;
  readonly name: string;
  readonly description: string;
}

export const DASHBOARD_ATMOSPHERES: readonly DashboardAtmosphereOption[] = [
  {
    id: 'hybrid',
    name: 'Hybrid nguyên bản',
    description: 'Kem ấm · teal sâu',
  },
  {
    id: 'sage',
    name: 'Sage café',
    description: 'Thảo mộc · rừng tĩnh',
  },
  {
    id: 'apricot',
    name: 'Apricot dusk',
    description: 'Đào nhạt · mận trầm',
  },
  {
    id: 'lilac',
    name: 'Lilac circuit',
    description: 'Tím sương · chàm đêm',
  },
  {
    id: 'lagoon',
    name: 'Teal lagoon',
    description: 'Lam ngọc · biển sâu',
  },
  {
    id: 'midnight',
    name: 'Midnight ink',
    description: 'Xám lam · mực chàm',
  },
];

const STORAGE_KEY = 'nexuscord-dashboard-atmosphere';
const ATMOSPHERE_IDS = new Set<DashboardAtmosphere>(
  DASHBOARD_ATMOSPHERES.map((option) => option.id),
);

@Injectable({
  providedIn: 'root',
})
export class DashboardAppearance {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly atmosphereState = signal<DashboardAtmosphere>(this.readInitialAtmosphere());

  readonly atmosphere = this.atmosphereState.asReadonly();
  readonly options = DASHBOARD_ATMOSPHERES;

  setAtmosphere(atmosphere: DashboardAtmosphere): void {
    if (!ATMOSPHERE_IDS.has(atmosphere)) {
      return;
    }

    this.atmosphereState.set(atmosphere);
    this.persistAtmosphere(atmosphere);
  }

  private readInitialAtmosphere(): DashboardAtmosphere {
    if (!isPlatformBrowser(this.platformId)) {
      return 'hybrid';
    }

    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      if (stored && ATMOSPHERE_IDS.has(stored as DashboardAtmosphere)) {
        return stored as DashboardAtmosphere;
      }
    } catch {
      // Storage có thể bị chặn; Hybrid vẫn là fallback an toàn của Dashboard.
    }

    return 'hybrid';
  }

  private persistAtmosphere(atmosphere: DashboardAtmosphere): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, atmosphere);
    } catch {
      // Palette vẫn đổi trong phiên hiện tại nếu storage không khả dụng.
    }
  }
}
