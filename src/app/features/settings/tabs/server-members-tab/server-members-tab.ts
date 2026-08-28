import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { UserSettingsService, ServerMemberItem, ServerRoleItem } from '../../services/user-settings.service';
import { ChatSocketService } from '../../../../core/realtime/chat-socket.service';

@Component({
  selector: 'app-server-members-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-members-tab.html',
  styleUrl: './server-members-tab.css',
})
export class ServerMembersTab implements OnInit, OnDestroy {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly chatSocket = inject(ChatSocketService, { optional: true });
  private memberJoinedSub?: Subscription;

  protected readonly memberSearchQuery = signal<string>('');
  protected readonly selectedRoleFilter = signal<string>('all');
  protected readonly selectedMemberIds = signal<string[]>([]);
  protected readonly activeTab = signal<'active' | 'banned'>('active');

  protected readonly banReason = signal<string>('');
  protected readonly selectedMemberForBan = signal<ServerMemberItem | null>(null);
  protected readonly activeRoleMenuMemberId = signal<string | null>(null);
  protected readonly toastMessage = signal<string | null>(null);

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.role-menu-container')) {
      this.activeRoleMenuMemberId.set(null);
    }
  }

  protected toggleRoleMenu(memberId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeRoleMenuMemberId() === memberId) {
      this.activeRoleMenuMemberId.set(null);
    } else {
      this.activeRoleMenuMemberId.set(memberId);
    }
  }

  protected readonly filteredMembers = computed<ServerMemberItem[]>(() => {
    const q = this.memberSearchQuery().trim().toLowerCase();
    const roleFilter = this.selectedRoleFilter();
    let members = this.settingsService.serverMembers();

    if (q) {
      members = members.filter(
        (m) => m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q),
      );
    }

    if (roleFilter !== 'all') {
      members = members.filter((m) => m.roles.includes(roleFilter));
    }

    return members;
  });

  protected readonly isAllSelected = computed<boolean>(() => {
    const list = this.filteredMembers();
    const selected = this.selectedMemberIds();
    return list.length > 0 && list.every((m) => selected.includes(m.id));
  });

  protected toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedMemberIds.set([]);
    } else {
      this.selectedMemberIds.set(this.filteredMembers().map((m) => m.id));
    }
  }

  protected toggleSelectMember(memberId: string): void {
    const current = this.selectedMemberIds();
    if (current.includes(memberId)) {
      this.selectedMemberIds.set(current.filter((id) => id !== memberId));
    } else {
      this.selectedMemberIds.set([...current, memberId]);
    }
  }

  protected isMemberSelected(memberId: string): boolean {
    return this.selectedMemberIds().includes(memberId);
  }

  protected clearSelection(): void {
    this.selectedMemberIds.set([]);
  }

  protected getRoleColor(roleId: string): string {
    const role = this.settingsService.serverRoles().find((r: ServerRoleItem) => r.id === roleId);
    return role?.color || '#99aab5';
  }

  protected getRoleName(roleId: string): string {
    const role = this.settingsService.serverRoles().find((r: ServerRoleItem) => r.id === roleId);
    return role?.name || roleId;
  }

  protected toggleRole(memberId: string, roleId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.settingsService.toggleMemberRole(memberId, roleId);
  }

  protected hasRole(member: ServerMemberItem, roleId: string): boolean {
    return member.roles.includes(roleId);
  }

  protected copyUserId(id: string): void {
    navigator.clipboard?.writeText(id);
    this.showToast('Đã sao chép ID người dùng: ' + id);
  }

  protected kick(id: string): void {
    this.settingsService.kickServerMember(id);
    this.selectedMemberIds.set(this.selectedMemberIds().filter((mId) => mId !== id));
    this.showToast('Đã trục xuất (Kick) thành viên khỏi máy chủ.');
  }

  protected bulkKick(): void {
    const ids = this.selectedMemberIds();
    ids.forEach((id) => this.settingsService.kickServerMember(id));
    this.selectedMemberIds.set([]);
    this.showToast(`Đã trục xuất ${ids.length} thành viên khỏi máy chủ.`);
  }

  protected openBanModal(m: ServerMemberItem): void {
    this.selectedMemberForBan.set(m);
    this.banReason.set('');
  }

  protected confirmBan(): void {
    const m = this.selectedMemberForBan();
    if (m) {
      this.settingsService.banServerMember(m.id, this.banReason());
      this.selectedMemberIds.set(this.selectedMemberIds().filter((mId) => mId !== m.id));
      this.selectedMemberForBan.set(null);
      this.showToast(`Đã cấm (Ban) ${m.displayName} khỏi máy chủ.`);
    }
  }

  protected cancelBan(): void {
    this.selectedMemberForBan.set(null);
  }

  protected unban(id: string): void {
    this.settingsService.unbanServerMember(id);
    this.showToast('Đã bỏ cấm (Unban) thành công. Thành viên đã quay lại danh sách!');
    this.activeTab.set('active');
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  ngOnInit(): void {
    const sId = this.settingsService.currentServerId();
    if (sId) {
      void this.settingsService.loadServerRoles(sId);
      void this.settingsService.loadServerMembers(sId);
      void this.settingsService.loadServerBans(sId);
      if (this.chatSocket) {
        void this.chatSocket.joinServer(sId);
      }
    }

    if (this.chatSocket) {
      this.memberJoinedSub = this.chatSocket.serverMemberJoined$.subscribe((payload) => {
        if (payload.serverId === this.settingsService.currentServerId()) {
          const name = payload.member?.displayName || payload.member?.username || 'Thành viên mới';
          this.showToast(`🎉 ${name} vừa gia nhập máy chủ!`);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.memberJoinedSub?.unsubscribe();
  }
}
