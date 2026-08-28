import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { bannerColorFor, PROFILE_NOTE_MAX, profileDisplayName, type PublicProfile } from '../../../../../shared';
import { PresenceService } from '../../../../core/presence/presence.service';
import { ServersApiService } from '../../../../core/api/servers-api.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import { UserSettingsService } from '../../../settings/services/user-settings.service';
import { FriendsStore } from '../../../dashboard/friends/services/friends-store';
import { OpenDm } from '../../open-dm';
import { ProfileNote } from '../../profile-note';
import { ProfileStore } from '../../profile-store';
import { linkIconFor, prettyUrl } from '../link-icon';

/**
 * Ruột của hồ sơ: ảnh bìa, avatar, tên, dòng trạng thái, giới thiệu, liên kết,
 * ngày sinh, máy chủ và danh sách bạn bè.
 *
 * Dùng chung cho trang `/u/:username` và cửa sổ hồ sơ nổi giữa màn hình.
 */
@Component({
  selector: 'app-profile-card',
  imports: [Avatar, MatIconModule],
  providers: [OpenDm, ProfileNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.css',
})
export class ProfileCard {
  readonly profile = input.required<PublicProfile>();
  /** Nền phía sau thẻ — quyết định màu viền avatar và ảnh bìa. */
  readonly surface = input<'canvas' | 'surface'>('surface');
  /** Cao hơn ở cửa sổ giữa màn hình, thấp hơn ở thẻ nổi cạnh chat. */
  readonly bannerHeight = input<'sm' | 'lg'>('lg');

  protected readonly note = inject(ProfileNote);
  protected readonly noteMax = PROFILE_NOTE_MAX;

  private readonly presenceService = inject(PresenceService, { optional: true });
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore);
  private readonly friendsStore = inject(FriendsStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);
  private readonly userSettings = inject(UserSettingsService);
  private readonly dialog = inject(MatDialog, { optional: true });

  protected readonly presence = computed(() => {
    const person = this.profile();
    if (person.isSelf) return 'online';
    if (!this.presenceService) return 'online';
    return this.presenceService.getPresence(person.id)() ?? 'online';
  });

  constructor() {
    effect(() => {
      const person = this.profile();
      if (!person.isSelf) {
        void this.note.load(person.username);
      } else {
        void this.friendsStore.load();
        void this.serversStore.ensureHydrated(this.serversApi);
      }
    });
  }

  protected saveNote(value: string): void {
    void this.note.save(this.profile().username, value.trim());
  }

  protected readonly name = computed(() => profileDisplayName(this.profile()));

  protected readonly bannerColor = computed(() => {
    const person = this.profile();
    return bannerColorFor(person.username, person.accentColor);
  });

  /** "Tháng 8, 2026" — tự dựng vì ứng dụng chưa nạp locale tiếng Việt. */
  protected readonly joined = computed(() => {
    const date = new Date(this.profile().createdAt);
    return Number.isNaN(date.getTime())
      ? '—'
      : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  });

  /** Ngày tháng năm sinh định dạng rõ ràng */
  protected readonly birthdateFormatted = computed(() => {
    const person = this.profile();
    const rawDate = person.birthdate ?? (person.isSelf ? this.profileStore.profile()?.birthdate : null);
    if (!rawDate) return null;
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${Number(day)} Tháng ${Number(month)}, ${year}`;
    }
    return rawDate;
  });

  /** Danh sách máy chủ (máy chủ tham gia nếu là chính chủ, hoặc máy chủ chung nếu là người khác) */
  protected readonly serversList = computed(() => {
    const person = this.profile();
    if (person.isSelf) {
      return this.serversStore.servers().map((s) => ({
        id: s.id,
        name: s.name,
        iconUrl: s.iconUrl,
      }));
    }
    return person.mutualServers ?? [];
  });

  protected readonly serversCount = computed(() => this.serversList().length);

  /** Danh sách bạn bè (tất cả bạn bè nếu là chính chủ, hoặc bạn chung nếu là người khác) */
  protected readonly friendsList = computed(() => {
    const person = this.profile();
    if (person.isSelf) {
      return this.friendsStore.friends().map((f) => ({
        id: f.id,
        username: f.username ?? f.name,
        displayName: f.name,
        avatarUrl: f.avatarUrl ?? null,
      }));
    }
    return person.mutualFriends ?? [];
  });

  protected readonly friendsCount = computed(() => this.friendsList().length);

  protected readonly gamesCount = computed(() => this.profile().games?.length ?? 0);

  protected iconFor(url: string): string {
    return linkIconFor(url);
  }

  protected shortUrl(url: string): string {
    return prettyUrl(url);
  }

  private readonly dm = inject(OpenDm);
  protected readonly openingDm = this.dm.opening;
  protected readonly dmError = this.dm.errorMessage;

  protected openDm(): void {
    void this.dm.open(this.profile().id);
  }

  /**
   * Cài Đặt là một modal sống trong `AppLayout` (khung `/channels`), không phải
   * route riêng — đóng Profile Dialog trước khi mở Cài Đặt.
   */
  protected editProfile(): void {
    this.dialog?.closeAll();
    this.userSettings.openUserSettings('profile');
  }
}
