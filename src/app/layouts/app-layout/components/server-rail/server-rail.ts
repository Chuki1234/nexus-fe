import {
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CdkDrag, type CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UnreadBadge } from '../../../../shared/ui/unread-badge/unread-badge';
import {
  type ServerGroupSummary,
  type ServerSummary,
  ShellData,
} from '../../../../core/api/shell-data';

/**
 * Cột 1 — dải icon server dọc mép trái.
 *
 * Chỉ báo "đang mở" là thanh xanh dán vào mép trái, đúng `ex-app-shell-row` trong
 * design system (`activeIndicator: {colors.primary}`). Cùng với chấm presence,
 * đây là chỗ duy nhất ngoài CTA được dùng màu xanh — chỉ báo trạng thái.
 *
 * Trạng thái active đọc từ `routerLinkActive` chứ không tự tách URL: rail nằm
 * ngoài router-outlet nên không có route params, mà tự parse chuỗi thì sẽ lệch
 * ngay khi cấu trúc route đổi.
 */
@Component({
  selector: 'app-server-rail',
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    UnreadBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-full w-18 shrink-0 flex-col items-center gap-2 overflow-hidden bg-canvas py-3',
  },
  templateUrl: './server-rail.html',
  styleUrl: './server-rail.css',
})
export class ServerRail {
  private readonly shell = inject(ShellData);
  private readonly dialog = inject(MatDialog);

  protected readonly servers = this.shell.servers;
  protected readonly serverGroups = this.shell.serverGroups;
  private readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());
  protected readonly activeDropSlot = signal<string | null>(null);
  protected readonly addServerStep = signal<'choose' | 'create' | 'join'>('choose');

  protected readonly ungroupedServers = computed(() => {
    const groupedIds = new Set(this.serverGroups().flatMap((group) => group.serverIds));
    return this.servers().filter((server) => !groupedIds.has(server.id));
  });

  protected serversInGroup(group: ServerGroupSummary): ServerSummary[] {
    const byId = new Map(this.servers().map((server) => [server.id, server]));
    return group.serverIds.flatMap((id) => {
      const server = byId.get(id);
      return server ? [server] : [];
    });
  }

  protected groupIsExpanded(groupId: string): boolean {
    return !this.collapsedGroups().has(groupId);
  }

  protected toggleGroup(groupId: string): void {
    this.collapsedGroups.update((collapsed) => {
      const next = new Set(collapsed);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  protected dropOnServer(event: CdkDragDrop<string, string, string>, targetServerId: string): void {
    this.activeDropSlot.set(null);
    if (event.isPointerOverContainer) {
      this.shell.groupServers(event.item.data, targetServerId);
    }
  }

  protected dropOnGroup(event: CdkDragDrop<string, string, string>, targetGroupId: string): void {
    this.activeDropSlot.set(null);
    if (event.isPointerOverContainer) {
      this.shell.addServerToGroup(event.item.data, targetGroupId);
    }
  }

  protected dropIntoGroupAt(
    event: CdkDragDrop<string, string, string>,
    targetGroupId: string,
    insertionIndex: number,
  ): void {
    this.activeDropSlot.set(null);
    if (event.isPointerOverContainer) {
      this.shell.moveServerToGroup(event.item.data, targetGroupId, insertionIndex);
    }
  }

  protected dropOutsideGroupsAt(
    event: CdkDragDrop<string, string, string>,
    insertionIndex: number,
  ): void {
    this.activeDropSlot.set(null);
    if (event.isPointerOverContainer) {
      this.shell.moveServerOutsideGroups(event.item.data, insertionIndex);
    }
  }

  protected activateDropSlot(slotId: string): void {
    this.activeDropSlot.set(slotId);
  }

  protected deactivateDropSlot(slotId: string): void {
    if (this.activeDropSlot() === slotId) {
      this.activeDropSlot.set(null);
    }
  }

  protected groupSlotId(groupId: string, insertionIndex: number): string {
    return `group-${groupId}-slot-${insertionIndex}`;
  }

  protected railSlotId(insertionIndex: number): string {
    return `rail-slot-${insertionIndex}`;
  }

  protected openAddServer(template: TemplateRef<unknown>): void {
    this.addServerStep.set('choose');
    this.dialog.open(template, {
      ariaLabel: 'Thêm máy chủ',
      autoFocus: 'dialog',
      maxHeight: 'calc(100vh - 2rem)',
      maxWidth: '34rem',
      panelClass: 'nexus-add-server-dialog',
      restoreFocus: true,
      width: 'calc(100vw - 2rem)',
    });
  }

  protected groupMentions(servers: ServerSummary[]): number {
    return servers.reduce((total, server) => total + server.mentionCount, 0);
  }

  protected groupHasUnread(servers: ServerSummary[]): boolean {
    return servers.some((server) => server.unread);
  }

  /** Chữ cái đầu làm icon server khi chưa có ảnh. */
  protected initialsOf(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  }

  /**
   * Mở thẳng kênh đầu tiên thay vì dừng ở trang server rỗng — bấm vào server mà
   * phải bấm thêm một lần nữa mới đọc được gì là thừa một bước.
   */
  protected linkFor(serverId: string): unknown[] {
    const first = this.shell.channelsOf(serverId)[0];
    return first ? ['/channels', serverId, first.id] : ['/channels', serverId];
  }
}
