import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';

export interface ArtisanPalette {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  theme: AppPreferences['theme'];
  gradient: string;
  bgDark: string;
  tags: string[];
}

@Component({
  selector: 'app-color-studio-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './color-studio-modal.html',
  styleUrl: './color-studio-modal.css',
})
export class ColorStudioModal {
  protected readonly settingsService = inject(UserSettingsService);

  // 2D Saturation/Value canvas box ref
  protected readonly colorBoxRef = viewChild<ElementRef<HTMLDivElement>>('colorBox');

  // Active sub-tab inside modal: 'artisan' | 'studio'
  protected readonly activeTab = signal<'artisan' | 'studio'>('artisan');

  // Custom Color Picker State
  protected readonly hue = signal(145);
  protected readonly saturation = signal(100);
  protected readonly brightness = signal(93);
  protected readonly customHexInput = signal('#00ed64');
  protected readonly isDraggingColor = signal(false);

  // Bộ sưu tập nghệ thuật phối màu cao cấp & hiện đại
  protected readonly artisanPalettes: ArtisanPalette[] = [
    {
      id: 'thanh-hoa',
      name: 'Sứ Thanh Hoa (Cobalt)',
      subtitle: 'Men lam hoàng gia quý phái trên nền gốm sứ sang trọng',
      accent: '#2563eb',
      theme: 'nexus-dark',
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #38bdf8 100%)',
      bgDark: '#081426',
      tags: ['Cổ Điển', 'Men Sứ', 'Hoàng Gia'],
    },
    {
      id: 'thanh-hoa-light',
      name: 'Thanh Hoa Bạch Ngọc',
      subtitle: 'Sắc xanh ngọc lam thanh thoát trên nền gốm sứ tinh khiết',
      accent: '#0284c7',
      theme: 'nexus-dark',
      gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
      bgDark: '#091824',
      tags: ['Bạch Ngọc', 'Tinh Khiết', 'Gốm Sứ'],
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk Neon',
      subtitle: 'Xanh Neon Cyan & Hồng dạ quang trên nền AMOLED sâu thẳm',
      accent: '#00f5d4',
      theme: 'midnight-dark',
      gradient: 'linear-gradient(135deg, #00f5d4 0%, #7b2cbf 100%)',
      bgDark: '#06070a',
      tags: ['Cyberpunk', 'Neon', 'Hi-Tech'],
    },
    {
      id: 'sakura-noir',
      name: 'Sakura Noir',
      subtitle: 'Hồng cánh hoa anh đào thanh thoát trên nền đá phiến tối',
      accent: '#fb7185',
      theme: 'midnight-dark',
      gradient: 'linear-gradient(135deg, #fb7185 0%, #fda4af 100%)',
      bgDark: '#110b14',
      tags: ['Pastel', 'Ngọt Ngào', 'Tối Giản'],
    },
    {
      id: 'royal-obsidian',
      name: 'Hoàng Kim Obsidian',
      subtitle: 'Vàng kim Champagne lộng lẫy trên nền nhung đen Onyx',
      accent: '#eab308',
      theme: 'midnight-dark',
      gradient: 'linear-gradient(135deg, #eab308 0%, #fef08a 100%)',
      bgDark: '#0f0d08',
      tags: ['Vương Giả', 'Luxury', 'Thượng Lưu'],
    },
    {
      id: 'linear-emerald',
      name: 'Linear Emerald',
      subtitle: 'Xanh lục bảo sắc sảo, hiện đại theo phong cách Linear/Geist',
      accent: '#10b981',
      theme: 'nexus-dark',
      gradient: 'linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)',
      bgDark: '#041811',
      tags: ['Hiện Đại', 'Linear-Style', 'Tinh Tế'],
    },
    {
      id: 'sunset-mirage',
      name: 'Sunset Mirage',
      subtitle: 'Ánh hoàng hôn cam san hô ấm áp phản chiếu mặt biển đêm',
      accent: '#f97316',
      theme: 'midnight-dark',
      gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
      bgDark: '#140c08',
      tags: ['Hoàng Hôn', 'Ấm Áp', 'Nồng Nhiệt'],
    },
    {
      id: 'cosmic-iris',
      name: 'Cosmic Iris',
      subtitle: 'Sắc tím tinh vân vũ trụ đa chiều đầy mê hoặc',
      accent: '#8b5cf6',
      theme: 'midnight-dark',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
      bgDark: '#0d0917',
      tags: ['Vũ Trụ', 'Huyền Bí', 'Vô Tận'],
    },
  ];

  constructor() {
    const initialHex = this.settingsService.preferences().themeAccent || '#00ed64';
    this.customHexInput.set(initialHex);
    const hsv = this.hexToHsv(initialHex);
    this.hue.set(hsv.h);
    this.saturation.set(hsv.s);
    this.brightness.set(hsv.v);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  protected close(): void {
    this.settingsService.closeColorStudio();
  }

  protected setTab(tab: 'artisan' | 'studio'): void {
    this.activeTab.set(tab);
  }

  protected setAccent(hex: string): void {
    this.customHexInput.set(hex);
    const hsv = this.hexToHsv(hex);
    this.hue.set(hsv.h);
    this.saturation.set(hsv.s);
    this.brightness.set(hsv.v);
    this.settingsService.updatePreference('themeAccent', hex);
  }

  protected applyArtisanPalette(palette: ArtisanPalette): void {
    this.setAccent(palette.accent);
  }

  // ─── Tương tác 2D Color Studio ───

  protected onHueChange(h: number): void {
    this.hue.set(h);
    this.recalcCurrentColor();
  }

  protected onBrightnessChange(v: number): void {
    this.brightness.set(v);
    this.recalcCurrentColor();
  }

  protected onHexInputChange(rawHex: string): void {
    let clean = rawHex.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    this.customHexInput.set(clean);
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      const hsv = this.hexToHsv(clean);
      this.hue.set(hsv.h);
      this.saturation.set(hsv.s);
      this.brightness.set(hsv.v);
      this.settingsService.updatePreference('themeAccent', clean);
    }
  }

  protected onColorBoxPointerDown(event: MouseEvent | TouchEvent): void {
    this.isDraggingColor.set(true);
    this.updateSVFromPointer(event);

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (this.isDraggingColor()) {
        this.updateSVFromPointer(e);
      }
    };

    const onPointerUp = () => {
      this.isDraggingColor.set(false);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove);
    window.addEventListener('touchend', onPointerUp);
  }

  private updateSVFromPointer(event: MouseEvent | TouchEvent): void {
    const boxEl = this.colorBoxRef()?.nativeElement;
    if (!boxEl) return;

    const rect = boxEl.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);

    this.saturation.set(s);
    this.brightness.set(v);
    this.recalcCurrentColor();
  }

  private recalcCurrentColor(): void {
    const hex = this.hsvToHex(this.hue(), this.saturation(), this.brightness());
    this.customHexInput.set(hex);
    this.settingsService.updatePreference('themeAccent', hex);
  }

  // ─── Tiện ích chuyển đổi màu HSV <-> HEX ───

  private hsvToHex(h: number, s: number, v: number): string {
    const sNorm = s / 100;
    const vNorm = v / 100;
    const c = vNorm * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vNorm - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  private hexToHsv(hex: string): { h: number; s: number; v: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    if (clean.length !== 6) return { h: 145, s: 100, v: 93 };

    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;

    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h = Math.round(h * 60);
    }

    return { h, s: Math.round(s), v: Math.round(v) };
  }
}
