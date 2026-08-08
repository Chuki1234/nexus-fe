import {
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CdkDrag, type CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UnreadBadge } from '../../../../shared/ui/unread-badge/unread-badge';
import {
  type ChannelSummary,
  type ConversationSummary,
  type ServerGroupSummary,
  type ServerSummary,
  ShellData,
} from '../../../../core/api/shell-data';

interface CommandResult {
  id: string;
  icon: string;
  kind: 'server' | 'text-channel' | 'voice-channel' | 'conversation';
  label: string;
  context: string;
  link: string[];
  searchableText: string;
}

type GroupingTargetKind = 'group' | 'server';

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
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    UnreadBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-full w-18 shrink-0 flex-col items-center gap-2 overflow-hidden bg-canvas py-3',
    '(document:keydown)': 'handleGlobalShortcut($event)',
  },
  templateUrl: './server-rail.html',
  styleUrl: './server-rail.css',
})
export class ServerRail {
  private readonly shell = inject(ShellData);
  private readonly dialog = inject(MatDialog);
  private readonly commandDialog = viewChild.required<TemplateRef<unknown>>('commandDialog');

  protected readonly servers = this.shell.servers;
  protected readonly serverGroups = this.shell.serverGroups;
  private readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());
  protected readonly activeDropSlot = signal<string | null>(null);
  protected readonly activeGroupingTarget = signal<string | null>(null);
  protected readonly activeUngroupTarget = signal<string | null>(null);
  protected readonly draggingServerId = signal<string | null>(null);
  protected readonly addServerStep = signal<'choose' | 'create' | 'join'>('choose');
  protected readonly commandQuery = signal('');

  private readonly commandItems = computed<CommandResult[]>(() => {
    const servers = this.servers();
    const serverItems = servers.map((server) => this.serverCommand(server));
    const channelItems = servers.flatMap((server) =>
      this.shell.channelsOf(server.id).map((channel) => this.channelCommand(server, channel)),
    );
    const conversationItems = this.shell
      .conversations()
      .map((conversation) => this.conversationCommand(conversation));

    return [...conversationItems, ...serverItems, ...channelItems];
  });

  protected readonly commandResults = computed(() => {
    const query = this.normalizeSearch(this.commandQuery());
    const items = this.commandItems();
    if (!query) {
      return items.slice(0, 9);
    }

    return items
      .filter((item) => this.normalizeSearch(item.searchableText).includes(query))
      .slice(0, 12);
  });

  protected readonly ungroupedServers = computed(() => {
    const groupedIds = new Set(this.serverGroups().flatMap((group) => group.serverIds));
    return this.servers().filter((server) => !groupedIds.has(server.id));
  });

  protected readonly draggingSourceGroupId = computed(() => {
    const serverId = this.draggingServerId();
    if (!serverId) {
      return null;
    }

    return this.serverGroups().find((group) => group.serverIds.includes(serverId))?.id ?? null;
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
    this.clearDropFeedback();
    if (event.isPointerOverContainer) {
      this.shell.groupServers(event.item.data, targetServerId);
    }
  }

  protected dropOnGroup(event: CdkDragDrop<string, string, string>, targetGroupId: string): void {
    this.clearDropFeedback();
    if (event.isPointerOverContainer) {
      this.shell.addServerToGroup(event.item.data, targetGroupId);
    }
  }

  protected dropIntoGroupAt(
    event: CdkDragDrop<string, string, string>,
    targetGroupId: string,
    insertionIndex: number,
  ): void {
    this.clearDropFeedback();
    if (event.isPointerOverContainer) {
      this.shell.moveServerToGroup(event.item.data, targetGroupId, insertionIndex);
    }
  }

  protected dropOutsideGroupsAt(
    event: CdkDragDrop<string, string, string>,
    insertionIndex: number,
  ): void {
    this.clearDropFeedback();
    if (event.isPointerOverContainer) {
      this.shell.moveServerOutsideGroups(event.item.data, insertionIndex);
    }
  }

  protected startServerDrag(serverId: string): void {
    this.draggingServerId.set(serverId);
    this.clearDropFeedback();
  }

  protected finishServerDrag(): void {
    this.draggingServerId.set(null);
    this.clearDropFeedback();
  }

  protected activateGroupingTarget(kind: GroupingTargetKind, targetId: string): void {
    const sourceServerId = this.draggingServerId();
    if (!sourceServerId || !this.canGroupWithTarget(sourceServerId, kind, targetId)) {
      this.activeGroupingTarget.set(null);
      return;
    }

    this.activeDropSlot.set(null);
    this.activeUngroupTarget.set(null);
    this.activeGroupingTarget.set(this.groupingTargetId(kind, targetId));
  }

  protected deactivateGroupingTarget(kind: GroupingTargetKind, targetId: string): void {
    const target = this.groupingTargetId(kind, targetId);
    if (this.activeGroupingTarget() === target) {
      this.activeGroupingTarget.set(null);
    }
  }

  protected groupingTargetIsActive(kind: GroupingTargetKind, targetId: string): boolean {
    return this.activeGroupingTarget() === this.groupingTargetId(kind, targetId);
  }

  protected activateDropSlot(slotId: string): void {
    this.activeGroupingTarget.set(null);
    this.activeUngroupTarget.set(null);
    this.activeDropSlot.set(slotId);
  }

  protected deactivateDropSlot(slotId: string): void {
    if (this.activeDropSlot() === slotId) {
      this.activeDropSlot.set(null);
    }
  }

  protected activateUngroupTarget(groupId: string): void {
    if (this.draggingSourceGroupId() !== groupId) {
      this.activeUngroupTarget.set(null);
      return;
    }

    this.activeDropSlot.set(null);
    this.activeGroupingTarget.set(null);
    this.activeUngroupTarget.set(groupId);
  }

  protected deactivateUngroupTarget(groupId: string): void {
    if (this.activeUngroupTarget() === groupId) {
      this.activeUngroupTarget.set(null);
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

  protected openCommandCenter(template: TemplateRef<unknown> = this.commandDialog()): void {
    this.commandQuery.set('');
    this.dialog.open(template, {
      ariaLabel: 'Tìm nhanh trong NexusCord',
      autoFocus: '.command-center__input',
      maxHeight: 'min(42rem, calc(100vh - 2rem))',
      maxWidth: '42rem',
      panelClass: 'nexus-add-server-dialog',
      restoreFocus: true,
      width: 'calc(100vw - 2rem)',
    });
  }

  protected handleGlobalShortcut(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') {
      return;
    }

    event.preventDefault();
    this.openCommandCenter();
  }

  protected updateCommandQuery(event: Event): void {
    this.commandQuery.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected commandKindLabel(kind: CommandResult['kind']): string {
    switch (kind) {
      case 'server':
        return 'Máy chủ';
      case 'text-channel':
        return 'Kênh chữ';
      case 'voice-channel':
        return 'Kênh thoại';
      case 'conversation':
        return 'Tin nhắn trực tiếp';
    }
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
  protected linkFor(serverId: string): string[] {
    const first = this.shell.channelsOf(serverId)[0];
    return first ? ['/channels', serverId, first.id] : ['/channels', serverId];
  }

  private serverCommand(server: ServerSummary): CommandResult {
    return {
      id: `server-${server.id}`,
      icon: 'dns',
      kind: 'server',
      label: server.name,
      context: server.unread ? 'Có cập nhật mới' : 'Đi tới máy chủ',
      link: this.linkFor(server.id),
      searchableText: `${server.name} máy chủ server`,
    };
  }

  private channelCommand(server: ServerSummary, channel: ChannelSummary): CommandResult {
    const voice = channel.type === 'voice';
    return {
      id: `channel-${server.id}-${channel.id}`,
      icon: voice ? 'volume_up' : 'tag',
      kind: voice ? 'voice-channel' : 'text-channel',
      label: channel.name,
      context: server.name,
      link: ['/channels', server.id, channel.id],
      searchableText: `${channel.name} ${server.name} ${voice ? 'kênh thoại voice' : 'kênh chữ text'}`,
    };
  }

  private conversationCommand(conversation: ConversationSummary): CommandResult {
    return {
      id: `conversation-${conversation.id}`,
      icon: 'alternate_email',
      kind: 'conversation',
      label: conversation.name,
      context: conversation.statusMessage ?? 'Mở cuộc trò chuyện',
      link: ['/channels', '@me', conversation.id],
      searchableText: `${conversation.name} ${conversation.statusMessage ?? ''} bạn bè tin nhắn dm`,
    };
  }

  private normalizeSearch(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private canGroupWithTarget(
    sourceServerId: string,
    kind: GroupingTargetKind,
    targetId: string,
  ): boolean {
    if (kind === 'group') {
      const targetGroup = this.serverGroups().find((group) => group.id === targetId);
      return !!targetGroup && !targetGroup.serverIds.includes(sourceServerId);
    }

    if (sourceServerId === targetId) {
      return false;
    }

    const sourceGroup = this.serverGroups().find((group) =>
      group.serverIds.includes(sourceServerId),
    );
    return !sourceGroup?.serverIds.includes(targetId);
  }

  private groupingTargetId(kind: GroupingTargetKind, targetId: string): string {
    return kind + ':' + targetId;
  }

  private clearDropFeedback(): void {
    this.activeDropSlot.set(null);
    this.activeGroupingTarget.set(null);
    this.activeUngroupTarget.set(null);
  }
}
