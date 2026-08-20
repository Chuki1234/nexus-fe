import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { UserSettingsService, ServerMemberItem } from '../../services/user-settings.service';

@Component({
  selector: 'app-server-members-tab',
  imports: [MatIconModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-members-tab.html',
  styleUrl: './server-members-tab.css',
})
export class ServerMembersTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly memberSearchQuery = signal<string>('');
  protected readonly banReason = signal<string>('');
  protected readonly selectedMemberForBan = signal<ServerMemberItem | null>(null);
  protected readonly activeRoleMenuMemberId = signal<string | null>(null);

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

  protected get filteredMembers(): ServerMemberItem[] {
    const q = this.memberSearchQuery().trim().toLowerCase();
    if (!q) return this.settingsService.serverMembers();
    return this.settingsService.serverMembers().filter(
      (m: ServerMemberItem) => m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q),
    );
  }

  protected getRoleColor(roleId: string): string {
    const role = this.settingsService.serverRoles().find((r: any) => r.id === roleId);
    return role?.color || '#99aab5';
  }

  protected getRoleName(roleId: string): string {
    const role = this.settingsService.serverRoles().find((r: any) => r.id === roleId);
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

  protected kick(id: string): void {
    this.settingsService.kickServerMember(id);
  }

  protected openBanModal(m: ServerMemberItem): void {
    this.selectedMemberForBan.set(m);
    this.banReason.set('');
  }

  protected confirmBan(): void {
    const m = this.selectedMemberForBan();
    if (m) {
      this.settingsService.banServerMember(m.id, this.banReason());
      this.selectedMemberForBan.set(null);
    }
  }

  protected cancelBan(): void {
    this.selectedMemberForBan.set(null);
  }

  protected unban(id: string): void {
    this.settingsService.unbanServerMember(id);
  }
}
