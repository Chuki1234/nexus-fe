import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { UserSettingsService, ServerRoleItem } from '../../services/user-settings.service';
import { ShellData } from '../../../../core/api/shell-data';

@Component({
  selector: 'app-server-roles-tab',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatMenuModule,
    DragDropModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-roles-tab.html',
  styleUrl: './server-roles-tab.css',
})
export class ServerRolesTab {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly shellData = inject(ShellData);

  // View mode: 'list' (Danh sách giống Discord ảnh 3) hoặc 'edit' (Chi tiết chỉnh sửa quyền của vai trò)
  protected readonly viewMode = signal<'list' | 'edit'>('list');
  protected readonly selectedRoleId = signal<string>('role-admin');
  protected readonly roleSearchQuery = signal<string>('');
  protected readonly activeRoleSubTab = signal<'display' | 'permissions' | 'channels'>('permissions');

  protected newRoleName = '';
  protected newRoleColor = '#38bdf8';
  protected readonly showCreateRoleModal = signal<boolean>(false);
  protected readonly toastMessage = signal<string | null>(null);

  protected readonly colorPresets = [
    '#99aab5', '#1abc9c', '#2ecc71', '#3498db', '#9b59b6',
    '#e91e63', '#f1c40f', '#e67e22', '#e74c3c', '#34495e',
    '#00ed64', '#38bdf8', '#a855f7', '#ec4899', '#f97316',
  ];

  protected readonly filteredRoles = computed(() => {
    const q = this.roleSearchQuery().trim().toLowerCase();
    const roles = this.settingsService.serverRoles();
    if (!q) return roles.filter((r) => !r.isDefault);
    return roles.filter((r) => !r.isDefault && r.name.toLowerCase().includes(q));
  });

  protected readonly defaultRole = computed(() => {
    return this.settingsService.serverRoles().find((r) => r.isDefault || r.id === 'role-everyone');
  });

  protected readonly availableChannels = computed(() => {
    const sId = this.settingsService.currentServerId();
    return this.shellData.channelsOf(sId);
  });

  protected readonly channelAccess = computed(() => {
    return this.settingsService.currentServerData().channelAccess || {};
  });

  protected get selectedRole(): ServerRoleItem | undefined {
    return this.settingsService.serverRoles().find((r: ServerRoleItem) => r.id === this.selectedRoleId());
  }

  protected onDrop(event: CdkDragDrop<ServerRoleItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.settingsService.reorderServerRoles(event.previousIndex, event.currentIndex);
  }

  protected openRoleEditor(id: string): void {
    this.selectedRoleId.set(id);
    this.viewMode.set('edit');
  }

  protected goBackToList(): void {
    this.viewMode.set('list');
  }

  protected createRole(): void {
    const name = this.newRoleName.trim();
    if (name) {
      this.settingsService.addServerRole(name, this.newRoleColor);
      this.newRoleName = '';
      this.showCreateRoleModal.set(false);
      this.showToast(`Đã tạo vai trò "${name}" thành công.`);
    }
  }

  protected deleteRole(id: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.settingsService.deleteServerRole(id);
    if (this.selectedRoleId() === id) {
      this.selectedRoleId.set('role-everyone');
      this.viewMode.set('list');
    }
    this.showToast('Đã xóa vai trò thành công.');
  }

  protected copyRoleId(id: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    navigator.clipboard?.writeText(id);
    this.showToast(`Đã sao chép ID vai trò: ${id}`);
  }

  protected togglePermission(permKey: keyof ServerRoleItem['permissions']): void {
    if (this.selectedRole) {
      this.settingsService.toggleRolePermission(this.selectedRole.id, permKey);
    }
  }

  protected updateRoleColor(color: string): void {
    if (this.selectedRole) {
      const sId = this.settingsService.currentServerId();
      this.settingsService.serverDataMap.update((map) => {
        const cur = map[sId];
        if (!cur) return map;
        return {
          ...map,
          [sId]: {
            ...cur,
            roles: cur.roles.map((r) => (r.id === this.selectedRole?.id ? { ...r, color } : r)),
          },
        };
      });
    }
  }

  protected isRoleAllowedForChannel(channelId: string, roleId: string): boolean {
    const access = this.channelAccess()[channelId];
    if (!access) return true;
    return access.includes(roleId) || access.includes('role-everyone');
  }

  protected toggleRoleChannelAccess(channelId: string, roleId: string): void {
    const currentAccess = this.channelAccess()[channelId] || ['role-admin', 'role-mod', 'role-vip', 'role-everyone'];
    let updated: string[];

    if (roleId === 'role-everyone') {
      if (currentAccess.includes('role-everyone')) {
        updated = ['role-admin', 'role-mod'];
      } else {
        updated = ['role-admin', 'role-mod', 'role-vip', 'role-everyone'];
      }
    } else {
      if (currentAccess.includes(roleId)) {
        updated = currentAccess.filter((r) => r !== roleId);
      } else {
        updated = [...currentAccess, roleId];
      }
      if (roleId !== 'role-admin' && currentAccess.includes('role-everyone')) {
        updated = updated.filter((r) => r !== 'role-everyone');
      }
    }

    this.settingsService.setChannelAllowedRoles(channelId, updated);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}
