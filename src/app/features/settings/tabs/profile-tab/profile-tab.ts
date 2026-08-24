import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService } from '../../services/user-settings.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

export interface GameItem {
  title: string;
  image: string;
  tags: string[];
}

export interface FavoriteGameItem {
  title: string;
  image: string;
}

@Component({
  selector: 'app-profile-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-tab.html',
  styleUrl: './profile-tab.css',
})
export class ProfileTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected readonly activeProfileSection = signal<'main' | 'server'>('main');
  protected readonly activeTab = signal<'board' | 'activity' | 'wishlist'>('board');

  protected readonly colorPresets = [
    { label: 'Deep Teal', hex: '#003d4f' },
    { label: 'House Green', hex: '#1e3932' },
    { label: 'Sapphire Blue', hex: '#3d4f9f' },
    { label: 'Amethyst Purple', hex: '#7b3ff2' },
    { label: 'Solar Orange', hex: '#fa6e39' },
    { label: 'Gold Vintage', hex: '#cba258' },
    { label: 'Abyss Navy', hex: '#001e2b' },
    { label: 'Crimson Rose', hex: '#8a4139' },
  ];

  protected readonly avatarPresets = [
    { label: 'Cyber Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nexus1' },
    { label: 'Pixel Cat', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CatGamer' },
    { label: 'Anime Hero', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex' },
    { label: 'Cosmic Star', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CosmicNexus' },
    { label: 'Neon Coder', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoderX' },
    { label: 'Cyber Spirit', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=NexusPrime' },
  ];

  protected readonly serverList = [
    { id: 's1', name: 'Nexus Developers Hub' },
    { id: 's2', name: 'Gaming Lounge VN' },
    { id: 's3', name: 'Anime & Manga Cafe' },
  ];

  protected readonly selectedServerId = signal<string>('s1');

  // ══ GAMING ACTIVITY & WIDGETS (Ảnh 3) ══
  protected readonly currentGames = signal<GameItem[]>([
    {
      title: 'The Finals',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80',
      tags: ['Đang chơi', '142 giờ'],
    },
    {
      title: 'VALORANT',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
      tags: ['FPS', '684 giờ'],
    },
  ]);

  protected readonly favoriteGames = signal<FavoriteGameItem[]>([
    {
      title: 'Black Myth: Wukong',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80',
    },
    {
      title: 'Cyberpunk 2077',
      image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=300&q=80',
    },
    {
      title: 'Honkai: Star Rail',
      image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&q=80',
    },
    {
      title: 'Elden Ring',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    },
  ]);

  protected selectBannerColor(color: string): void {
    this.settingsService.editBannerColor.set(color);
  }

  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.settingsService.editAvatarUrl.set(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  protected selectAvatarPreset(url: string): void {
    this.settingsService.editAvatarUrl.set(url);
  }

  protected removeAvatar(): void {
    this.settingsService.editAvatarUrl.set(null);
  }

  protected removeRotatingGame(index: number): void {
    this.currentGames.update((list) => list.filter((_, i) => i !== index));
  }

  protected removeRotatingTag(gameIndex: number, tagIndex: number): void {
    this.currentGames.update((list) =>
      list.map((game, i) => {
        if (i === gameIndex) {
          return {
            ...game,
            tags: game.tags.filter((_, ti) => ti !== tagIndex),
          };
        }
        return game;
      }),
    );
  }

  protected removeFavoriteGame(index: number): void {
    this.favoriteGames.update((list) => list.filter((_, i) => i !== index));
  }

  protected onImageError(event: Event, fallbackText: string): void {
    const img = event.target as HTMLImageElement;
    img.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(fallbackText)}`;
  }
}
