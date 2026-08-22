import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { UserSettingsService, ServerRoleItem } from '../../services/user-settings.service';

@Component({
  selector: 'app-server-roles-tab',
  imports: [MatIconModule, MatSlideToggleModule, MatTooltipModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-roles-tab.html',
  styleUrl: './server-roles-tab.css',
})
export class ServerRolesTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly selectedRoleId = signal<string>('role-admin');

  protected newRoleName = '';
  protected newRoleColor = '#3498db';
  protected readonly showCreateRoleModal = signal<boolean>(false);

  protected get selectedRole(): ServerRoleItem | undefined {
    return this.settingsService.serverRoles().find((r: ServerRoleItem) => r.id === this.selectedRoleId());
  }

  protected onDrop(event: CdkDragDrop<ServerRoleItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.settingsService.reorderServerRoles(event.previousIndex, event.currentIndex);
  }

  protected selectRole(id: string): void {
    this.selectedRoleId.set(id);
  }

  protected createRole(): void {
    if (this.newRoleName.trim()) {
      this.settingsService.addServerRole(this.newRoleName.trim(), this.newRoleColor);
      this.newRoleName = '';
      this.showCreateRoleModal.set(false);
    }
  }

  protected deleteRole(id: string): void {
    this.settingsService.deleteServerRole(id);
    if (this.selectedRoleId() === id) {
      this.selectedRoleId.set('role-everyone');
    }
  }

  protected togglePermission(permKey: keyof ServerRoleItem['permissions']): void {
    if (this.selectedRole) {
      this.settingsService.toggleRolePermission(this.selectedRole.id, permKey);
    }
  }
}
