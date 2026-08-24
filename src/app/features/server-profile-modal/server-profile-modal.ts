import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService } from '../settings/services/user-settings.service';
import { ShellData } from '../../core/api/shell-data';

export interface GameRotatingItem {
  title: string;
  tags: string[];
  image: string;
}

export interface GameFavoriteItem {
  title: string;
  image: string;
}

@Component({
  selector: 'app-server-profile-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-profile-modal.html',
  styleUrl: './server-profile-modal.css',
})
export class ServerProfileModal {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly shell = inject(ShellData);

  readonly serverId = input.required<string>();
  readonly close = output<void>();

  protected readonly activeTab = signal<'board' | 'activity' | 'wishlist'>('board');
  protected readonly isSaved = signal<boolean>(false);

  // Form draft state
  protected readonly nickname = signal<string>('Nghiện Khó Phai');
  protected readonly pronouns = signal<string>('he/him');
  protected readonly bio = signal<string>('I like playing Cypher, but Clove is my beloved.\nĐang thực hiện đồ án tốt nghiệp Nexus.');
  protected readonly customStatus = signal<string>('Anime ưa thích gần đây?');
  protected readonly avatarUrl = signal<string | null>('https://api.dicebear.com/7.x/bottts/svg?seed=nghienkhophai');
  protected readonly themePrimaryColor = signal<string>('#a13b56');
  protected readonly themeAccentColor = signal<string>('#2b2d31');

  // Authentic Game Posters (Steam Library 600x900)
  protected readonly currentGames = signal<GameRotatingItem[]>([
    {
      title: 'Wuthering Waves',
      tags: ['👍 Khá thích nó', '🏆 Tốt hơn bạn'],
      image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5zjh.jpg',
    },
    {
      title: 'VALORANT',
      tags: ['❤️ Mê đắm nó', '🏆 Tốt hơn bạn'],
      image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg',
    },
  ]);

  protected readonly favoriteGames = signal<GameFavoriteItem[]>([
    {
      title: 'Silksong',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1030300/library_600x900_2x.jpg',
    },
    {
      title: 'Black Myth: Wukong',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2358720/library_600x900_2x.jpg',
    },
    {
      title: 'Cyberpunk 2077',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900_2x.jpg',
    },
    {
      title: 'Elden Ring',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900_2x.jpg',
    },
    {
      title: 'VALORANT',
      image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg',
    },
    {
      title: 'NieR:Automata',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/524220/library_600x900_2x.jpg',
    },
    {
      title: 'Palworld',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1623730/library_600x900_2x.jpg',
    },
  ]);

  protected readonly serverData = computed(() => {
    const sId = this.serverId();
    return this.settingsService.serverDataMap()[sId] ?? this.settingsService.serverDataMap()['itss'];
  });

  protected readonly serverName = computed(() => this.serverData().name);

  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.avatarUrl.set(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  protected changeAvatarPreset(): void {
    const seeds = ['alex', 'sam', 'cyber_dev', 'nghienkhophai', 'shadow_hunter', 'lucas', 'neko', 'robot'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    this.avatarUrl.set(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
  }

  protected setPrimaryColor(color: string): void {
    this.themePrimaryColor.set(color);
  }

  protected onImageError(event: Event, fallbackTitle: string): void {
    const target = event.target as HTMLImageElement;
    target.src = `https://placehold.co/300x400/1e1f22/ffffff?text=${encodeURIComponent(fallbackTitle)}`;
  }

  protected removeRotatingGame(index: number): void {
    this.currentGames.update((list) => list.filter((_, i) => i !== index));
  }

  protected removeRotatingTag(gameIndex: number, tagIndex: number): void {
    this.currentGames.update((list) => {
      return list.map((g, idx) => {
        if (idx === gameIndex) {
          return { ...g, tags: g.tags.filter((_, tIdx) => tIdx !== tagIndex) };
        }
        return g;
      });
    });
  }

  protected removeFavoriteGame(index: number): void {
    this.favoriteGames.update((list) => list.filter((_, i) => i !== index));
  }

  protected saveProfile(): void {
    const sId = this.serverId();
    this.settingsService.addAuditLog(
      'Cập nhật hồ sơ thành viên máy chủ',
      `${this.nickname()} (${this.serverName()})`,
      'badge',
      sId,
    );

    this.isSaved.set(true);
    setTimeout(() => {
      this.isSaved.set(false);
      this.close.emit();
    }, 500);
  }
}
