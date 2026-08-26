import {
  ChangeDetectionStrategy,
  Component,
  type OnDestroy,
  type TemplateRef,
  computed,
  inject,
  NgZone,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  CdkDrag,
  CdkDragPreview,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import {
  type ServerDropIntent,
  type ServerDropResult,
  type HitZone,
  HitZoneCalculator,
  DwellTracker,
} from './services/server-drop-intent';
import { MatIconModule } from '@angular/material/icon';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter, map } from 'rxjs';
import { CommandCenterService } from '../../services/command-center.service';

export function trimmedMinLength(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = typeof control.value === 'string' ? control.value.trim() : '';
    if (!val || val.length < min) {
      return { trimmedMinLength: { requiredLength: min, actualLength: val.length } };
    }
    return null;
  };
}
import {
  CANONICAL_SERVER_TEMPLATES,
  type ChannelTemplateSeed,
  formatApiError,
  type ServerTemplate,
  ServersApiService,
} from '../../../../core/api/servers-api.service';
import { SectionLabel } from '../../../../shared/ui/section-label/section-label';
import { UnreadBadge } from '../../../../shared/ui/unread-badge/unread-badge';
import {
  type ChannelSummary,
  type ServerGroupSummary,
  type ServerSummary,
} from '../../../../core/servers/server.models';
import type { ConversationSummary } from '../../../../core/conversations/conversation.models';
import { FriendsStore } from '../../../../features/dashboard/friends/services/friends-store';

export type CommandScope = 'all' | 'server' | 'conversation' | 'text-channel' | 'voice-channel';
export type CommandPrefix = '*' | '@' | '#' | '!';

export const PREFIX_TO_SCOPE: Record<CommandPrefix, CommandScope> = {
  '*': 'server',
  '@': 'conversation',
  '#': 'text-channel',
  '!': 'voice-channel',
};

export const SCOPE_TO_PREFIX: Record<Exclude<CommandScope, 'all'>, CommandPrefix> = {
  server: '*',
  conversation: '@',
  'text-channel': '#',
  'voice-channel': '!',
};

export interface ParsedCommandQuery {
  raw: string;
  scope: CommandScope;
  prefix: CommandPrefix | null;
  searchTerm: string;
}

import {
  ConversationsApiService,
  type ConversationResponseDto,
} from '../../../../core/api/conversations-api.service';

export interface CommandResult {
  id: string;
  icon: string;
  kind: 'server' | 'text-channel' | 'voice-channel' | 'conversation';
  label: string;
  context: string;
  link?: string[];
  userId?: string;
  conversationId?: string;
  searchableText: string;
}

/** Mô hình phần tử trong danh sách 1D của Server Rail */
export type RailItem =
  | {
      kind: 'server';
      id: string;
      server: ServerSummary;
    }
  | {
      kind: 'folder';
      id: string;
      folder: ServerGroupSummary;
      servers: ServerSummary[];
      isOpen: boolean;
    };

import { ServerCapabilitiesService } from '../../../../core/servers/server-capabilities.service';
import { ServerInvitationsStore } from '../../../../core/servers/server-invitations.store';
import { ServersStore } from '../../../../core/servers/servers.store';

/**
 * Cột 1 — dải icon server dọc mép trái chuẩn Discord.
 * Tái thiết kế toàn diện theo đặc tả Drag & Drop và Folder System.
 */
@Component({
  selector: 'app-server-rail',
  imports: [
    CdkDrag,
    CdkDragPreview,
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    SectionLabel,
    UnreadBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex h-full w-18 shrink-0 flex-col items-center gap-2 overflow-hidden bg-canvas py-3 select-none',
    '(document:keydown)': 'handleGlobalShortcut($event)',
  },
  templateUrl: './server-rail.html',
  styleUrl: './server-rail.css',
})
export class ServerRail implements OnDestroy {
  private readonly serversStore = inject(ServersStore);
  private readonly friendsStore = inject(FriendsStore);
  private readonly invitationsStore = inject(ServerInvitationsStore);
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly dialog = inject(MatDialog);
  private readonly serversApi = inject(ServersApiService);
  private readonly router = inject(Router);
  private readonly commandCenterService = inject(CommandCenterService);
  private readonly commandDialog = viewChild.required<TemplateRef<unknown>>('commandDialog');
  private readonly subs = new Subscription();
  private readonly dmConversations = signal<ConversationResponseDto[]>([]);

  protected readonly totalDmUnreadCount = computed(() => {
    const pendingFriendRequests = this.friendsStore.incomingRequests().length;
    const pendingServerInvites = this.invitationsStore.pendingCount();
    const unreadDmMessages = this.dmConversations().reduce(
      (acc, c) => acc + (c.unreadCount || 0),
      0,
    );
    return pendingFriendRequests + pendingServerInvites + unreadDmMessages;
  });

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected isServerActive(serverId: string): boolean {
    if (this.serversStore.activeServerId() === serverId) {
      return true;
    }
    const url = this.currentUrl() ?? this.router.url;
    const pathWithoutQuery = url.split('?')[0].split('#')[0];
    const segments = pathWithoutQuery.split('/');
    return segments[1] === 'channels' && segments[2] === serverId;
  }

  protected isGroupActive(servers: ServerSummary[]): boolean {
    return servers.some((s) => this.isServerActive(s.id));
  }

  constructor() {
    this.subs.add(
      this.commandCenterService.requestOpen$.subscribe(() => {
        this.openCommandCenter();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  protected readonly servers = this.serversStore.servers;
  protected readonly serverGroups = this.serversStore.serverGroups;
  protected readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());

  /** Canonical State Machine for Server Rail Drag & Drop */
  protected readonly draggingServerId = signal<string | null>(null);
  protected readonly activeIntent = signal<ServerDropIntent>({ kind: 'none' });
  protected readonly dropAnnouncement = signal<string>('');

  private readonly ngZone = inject(NgZone);
  private readonly dwellTracker = new DwellTracker();
  private lastHitZone: HitZone | null = null;
  private autoScrollRafId: number | null = null;
  private folderOpenTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly draggingServer = computed(() => {
    const serverId = this.draggingServerId();
    return serverId ? (this.servers().find((server) => server.id === serverId) ?? null) : null;
  });

  protected startServerDrag(serverId: string): void {
    this.draggingServerId.set(serverId);
    this.dwellTracker.startSession(serverId);
    this.activeIntent.set({ kind: 'none' });
    this.lastHitZone = null;
  }

  protected finishServerDrag(): void {
    const intent = this.activeIntent();
    const result = this.serversStore.commitServerDrop(intent);
    if (result) {
      this.announceDropResult(result);
    }
    this.cancelDragSession();
  }

  protected cancelDragSession(): void {
    this.dwellTracker.endSession();
    this.draggingServerId.set(null);
    this.activeIntent.set({ kind: 'none' });
    this.lastHitZone = null;
    this.stopAutoScroll();

    if (typeof document !== 'undefined') {
      const draggedElements = document.querySelectorAll('.server-tile, .server-rail-item, .server-tile-wrapper');
      draggedElements.forEach((el) => {
        (el as HTMLElement).style.transform = '';
      });
    }
  }



  protected onRailListPointerMove(event: MouseEvent): void {
    const sourceId = this.draggingServerId();
    if (!sourceId) return;

    const pointerY = event.clientY;
    const railEl = event.currentTarget as HTMLElement | null;
    if (!railEl) return;

    const railRect = railEl.getBoundingClientRect();
    if (pointerY - railRect.top < 30) {
      railEl.scrollTop -= 6;
    } else if (railRect.bottom - pointerY < 30) {
      railEl.scrollTop += 6;
    }

    const candidateNodes = Array.from(
      railEl.querySelectorAll<HTMLElement>('.server-tile[data-server-id], .server-group-shell[data-server-group-id]'),
    ).filter((node) => {
      const id = node.getAttribute('data-server-id') || node.getAttribute('data-server-group-id');
      return id && id !== sourceId;
    });

    if (candidateNodes.length === 0) return;

    let targetEl: HTMLElement | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const node of candidateNodes) {
      const rect = node.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(pointerY - centerY);
      if (dist < minDistance) {
        minDistance = dist;
        targetEl = node;
      }
    }

    if (!targetEl) return;

    const targetServerId = targetEl.getAttribute('data-server-id');
    const targetGroupId = targetEl.getAttribute('data-server-group-id');
    const targetId = targetServerId || targetGroupId;
    if (!targetId || targetId === sourceId) return;

    const targetKind: 'server' | 'folder' = targetGroupId ? 'folder' : 'server';
    const parentGroupEl = targetEl.closest('.server-group-shell[data-server-group-id]');
    const parentGroupId =
      parentGroupEl && parentGroupEl !== targetEl
        ? parentGroupEl.getAttribute('data-server-group-id') || undefined
        : undefined;

    const rect = targetEl.getBoundingClientRect();
    const zone = HitZoneCalculator.compute(pointerY, rect, this.lastHitZone, 6);
    this.lastHitZone = zone;

    if (zone === 'top') {
      this.dwellTracker.cancelDwell();
      this.activeIntent.set({
        kind: 'insert-before',
        sourceServerId: sourceId,
        targetId,
        parentGroupId,
      });
      return;
    }

    if (zone === 'bottom') {
      this.dwellTracker.cancelDwell();
      this.activeIntent.set({
        kind: 'insert-after',
        sourceServerId: sourceId,
        targetId,
        parentGroupId,
      });
      return;
    }

    // Middle zone -> schedule dwell 280ms
    const current = this.activeIntent();
    if (
      (current.kind === 'merge-server' && current.targetServerId === targetId) ||
      (current.kind === 'insert-group' && current.targetGroupId === targetId)
    ) {
      return;
    }

    if (current.kind === 'merge-pending' && current.targetId === targetId) {
      return;
    }

    const token = this.dwellTracker.scheduleDwell(targetId, 280, () => {
      this.ngZone.run(() => {
        if (targetKind === 'server') {
          this.activeIntent.set({
            kind: 'merge-server',
            sourceServerId: sourceId,
            targetServerId: targetId,
          });
        } else {
          this.activeIntent.set({
            kind: 'insert-group',
            sourceServerId: sourceId,
            targetGroupId: targetId,
          });
        }
      });
    });

    this.activeIntent.set({
      kind: 'merge-pending',
      sourceServerId: sourceId,
      targetId,
      targetKind,
      dwellToken: token,
    });
  }

  protected onRailListPointerLeave(): void {
    this.dwellTracker.cancelDwell();
    this.lastHitZone = null;
    this.activeIntent.set({ kind: 'none' });
  }

  private stopAutoScroll(): void {
    if (this.autoScrollRafId !== null) {
      cancelAnimationFrame(this.autoScrollRafId);
      this.autoScrollRafId = null;
    }
  }

  protected isSlotBefore(targetId: string, parentGroupId?: string): boolean {
    const intent = this.activeIntent();
    return (
      intent.kind === 'insert-before' &&
      intent.targetId === targetId &&
      intent.parentGroupId === parentGroupId
    );
  }

  protected isSlotAfter(targetId: string, parentGroupId?: string): boolean {
    const intent = this.activeIntent();
    return (
      intent.kind === 'insert-after' &&
      intent.targetId === targetId &&
      intent.parentGroupId === parentGroupId
    );
  }

  protected isBottomRailSlot(): boolean {
    return this.activeIntent().kind === 'detach-to-rail';
  }

  protected isMergeActive(targetId: string): boolean {
    const intent = this.activeIntent();
    return (
      (intent.kind === 'merge-server' && intent.targetServerId === targetId) ||
      (intent.kind === 'insert-group' && intent.targetGroupId === targetId)
    );
  }

  protected isMergePending(targetId: string): boolean {
    const intent = this.activeIntent();
    return intent.kind === 'merge-pending' && intent.targetId === targetId;
  }

  private announceDropResult(result: ServerDropResult): void {
    let msg = '';
    switch (result.action) {
      case 'reorder-rail':
        msg = `Đã di chuyển máy chủ ${result.sourceServerName} sang vị trí mới.`;
        break;
      case 'create-group':
        msg = `Đã tạo nhóm mới chứa máy chủ ${result.sourceServerName} và ${result.targetName}.`;
        break;
      case 'add-to-group':
        msg = `Đã thêm máy chủ ${result.sourceServerName} vào nhóm ${result.targetName}.`;
        break;
      case 'reorder-group':
        msg = `Đã sắp xếp lại máy chủ ${result.sourceServerName} trong nhóm ${result.targetName}.`;
        break;
      case 'detach-from-group':
        msg = `Đã đưa máy chủ ${result.sourceServerName} ra khỏi nhóm.`;
        break;
    }
    this.dropAnnouncement.set(msg);
  }

  /**
   * Danh sách 1D thống nhất của Server Rail chứa hỗn hợp Server đơn lẻ và Folder
   */
  protected readonly railItems = computed<RailItem[]>(() => {
    const allServers = this.servers();
    const groups = this.serverGroups();
    const collapsed = this.collapsedGroups();
    const byId = new Map(allServers.map((s) => [s.id, s]));

    const processedGroupIds = new Set<string>();
    const groupedServerIds = new Set(groups.flatMap((g) => g.serverIds));
    const items: RailItem[] = [];

    for (const server of allServers) {
      if (!groupedServerIds.has(server.id)) {
        items.push({ kind: 'server', id: server.id, server });
      } else {
        const parentGroup = groups.find((g) => g.serverIds.includes(server.id));
        if (parentGroup && !processedGroupIds.has(parentGroup.id)) {
          processedGroupIds.add(parentGroup.id);
          const groupServers = parentGroup.serverIds
            .map((id) => byId.get(id))
            .filter((s): s is ServerSummary => !!s);
          if (groupServers.length > 0) {
            items.push({
              kind: 'folder',
              id: parentGroup.id,
              folder: parentGroup,
              servers: groupServers,
              isOpen: !collapsed.has(parentGroup.id),
            });
          }
        }
      }
    }

    for (const group of groups) {
      if (!processedGroupIds.has(group.id)) {
        processedGroupIds.add(group.id);
        const groupServers = group.serverIds
          .map((id) => byId.get(id))
          .filter((s): s is ServerSummary => !!s);
        if (groupServers.length > 0) {
          items.push({
            kind: 'folder',
            id: group.id,
            folder: group,
            servers: groupServers,
            isOpen: !collapsed.has(group.id),
          });
        }
      }
    }

    return items;
  });

  protected groupServerNamesTooltip(folderName: string, servers: ServerSummary[]): string {
    const names = servers.map((s) => s.name).filter(Boolean).join(', ');
    return names ? `${folderName}: ${names}` : folderName;
  }

  protected readonly addServerStep = signal<'choose' | 'template-list' | 'create' | 'join'>(
    'choose',
  );
  protected readonly commandQuery = signal('');
  protected readonly activeResultIndex = signal(0);

  protected readonly templates = signal<ServerTemplate[]>([...CANONICAL_SERVER_TEMPLATES]);
  protected readonly selectedTemplate = signal<ServerTemplate>(CANONICAL_SERVER_TEMPLATES[0]);
  protected readonly customTemplate = computed(
    () => this.templates().find((t) => t.id === 'custom') ?? CANONICAL_SERVER_TEMPLATES[0],
  );
  protected readonly presetTemplates = computed(() =>
    this.templates().filter((t) => t.id !== 'custom'),
  );
  protected readonly textChannelsOfSelected = computed(() =>
    this.selectedTemplate().channels.filter((c) => c.type === 'text'),
  );
  protected readonly voiceChannelsOfSelected = computed(() =>
    this.selectedTemplate().channels.filter((c) => c.type === 'voice'),
  );

  protected readonly serverNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, trimmedMinLength(2), Validators.maxLength(100)],
  });
  protected readonly isSubmitting = signal(false);
  protected readonly createErrorMessage = signal<string | null>(null);

  protected readonly parsedQuery = computed<ParsedCommandQuery>(() => {
    const raw = this.commandQuery();
    const trimmedStart = raw.trimStart();
    if (!trimmedStart) {
      return { raw, scope: 'all', prefix: null, searchTerm: '' };
    }

    const firstChar = trimmedStart[0];
    if (firstChar === '*' || firstChar === '@' || firstChar === '#' || firstChar === '!') {
      const prefix = firstChar as CommandPrefix;
      const scope = PREFIX_TO_SCOPE[prefix];
      const rest = trimmedStart.slice(1).trimStart();
      return { raw, scope, prefix, searchTerm: rest };
    }

    return { raw, scope: 'all', prefix: null, searchTerm: raw.trim() };
  });

  protected readonly commandScope = computed(() => this.parsedQuery().scope);

  private readonly commandItems = computed<CommandResult[]>(() => {
    const servers = this.servers();
    const serverItems = servers.map((server) => this.serverCommand(server));
    const channelItems = servers.flatMap((server) =>
      this.serversStore.channelsOf(server.id).map((channel) => this.channelCommand(server, channel)),
    );
    const friends = this.friendsStore.friends();
    const friendIds = new Set(friends.map((f) => f.id));
    const friendItems = friends.map((friend) => this.conversationCommand(friend));

    const extraConvItems = this.dmConversations()
      .filter((c) => !c.recipient?.id || !friendIds.has(c.recipient.id))
      .map((conv) => {
        const displayName =
          conv.recipient?.displayName || conv.recipient?.username || conv.name || 'Người dùng';
        return {
          id: `conversation-${conv.id}`,
          icon: 'alternate_email',
          kind: 'conversation' as const,
          label: displayName,
          context: conv.recipient?.statusMessage ?? 'Mở cuộc trò chuyện',
          link: ['/channels', '@me', conv.id],
          conversationId: conv.id,
          userId: conv.recipient?.id,
          searchableText: `${displayName} ${conv.recipient?.username ?? ''} ${conv.recipient?.statusMessage ?? ''} bạn bè tin nhắn dm`,
        };
      });

    return [...friendItems, ...extraConvItems, ...serverItems, ...channelItems];
  });

  protected readonly commandResults = computed(() => {
    const parsed = this.parsedQuery();
    const items = this.commandItems();

    const scopedItems =
      parsed.scope === 'all' ? items : items.filter((item) => item.kind === parsed.scope);

    const normalizedTerm = this.normalizeSearch(parsed.searchTerm);
    if (!normalizedTerm) {
      if (parsed.scope === 'all') {
        const conversations = items.filter((item) => item.kind === 'conversation').slice(0, 3);
        const servers = items.filter((item) => item.kind === 'server').slice(0, 3);
        const channels = items
          .filter((item) => item.kind === 'text-channel' || item.kind === 'voice-channel')
          .slice(0, 3);
        return [...conversations, ...servers, ...channels];
      }
      return scopedItems.slice(0, 12);
    }

    return scopedItems
      .map((item) => ({ item, score: this.commandScore(item, normalizedTerm) }))
      .filter((result) => Number.isFinite(result.score))
      .sort(
        (left, right) =>
          left.score - right.score || left.item.label.localeCompare(right.item.label, 'vi'),
      )
      .map((result) => result.item)
      .slice(0, 12);
  });

  protected readonly activeResultId = computed(() => {
    const results = this.commandResults();
    const index = this.activeResultIndex();
    const activeItem = results[index];
    return activeItem ? `result-opt-${activeItem.id}` : null;
  });

  protected readonly scopeHeading = computed(() => {
    const parsed = this.parsedQuery();
    switch (parsed.scope) {
      case 'server':
        return 'Máy chủ';
      case 'conversation':
        return 'Tin nhắn riêng';
      case 'text-channel':
        return 'Kênh chữ';
      case 'voice-channel':
        return 'Kênh thoại';
      case 'all':
      default:
        return parsed.searchTerm ? 'Kết quả phù hợp' : 'Lối tắt trong không gian của bạn';
    }
  });

  protected readonly emptyStateData = computed(() => {
    const parsed = this.parsedQuery();
    switch (parsed.scope) {
      case 'server':
        return {
          title: parsed.searchTerm ? 'Không tìm thấy máy chủ phù hợp' : 'Không có máy chủ nào',
          hint: 'Thử đổi từ khóa hoặc bấm "Tất cả" để tìm trong toàn bộ không gian.',
        };
      case 'conversation':
        return {
          title: parsed.searchTerm
            ? 'Không tìm thấy tin nhắn riêng phù hợp'
            : 'Không có tin nhắn riêng nào',
          hint: 'Thử đổi tên người bạn hoặc bấm "Tất cả" để tìm kiếm.',
        };
      case 'text-channel':
        return {
          title: parsed.searchTerm ? 'Không tìm thấy kênh chữ phù hợp' : 'Không có kênh chữ nào',
          hint: 'Thử đổi tên kênh chữ hoặc bấm "Tất cả" để tìm kiếm.',
        };
      case 'voice-channel':
        return {
          title: parsed.searchTerm
            ? 'Không tìm thấy kênh thoại phù hợp'
            : 'Không có kênh thoại nào',
          hint: 'Thử đổi tên kênh thoại hoặc bấm "Tất cả" để tìm kiếm.',
        };
      case 'all':
      default:
        return {
          title: parsed.searchTerm ? 'Không tìm thấy nơi phù hợp' : 'Không gian của bạn đang trống',
          hint: parsed.searchTerm
            ? 'Thử tên máy chủ, kênh hoặc người bạn khác.'
            : 'Thêm máy chủ hoặc kết bạn để xem Quick Switcher hoạt động.',
        };
    }
  });

  protected readonly resultAnnouncement = computed(() => {
    const count = this.commandResults().length;
    const scope = this.commandScope();
    const label = this.commandScopeLabel(scope);
    return `${count} kết quả ${label}`;
  });

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

  protected openAddServer(template: TemplateRef<unknown>): void {
    this.addServerStep.set('choose');
    this.selectedTemplate.set(CANONICAL_SERVER_TEMPLATES[0]);
    this.serverNameControl.reset('');
    this.isSubmitting.set(false);
    this.createErrorMessage.set(null);

    this.serversApi
      .getTemplates()
      .then((tpls) => {
        if (tpls && tpls.length > 0) {
          this.templates.set(tpls);
        }
      })
      .catch(() => {});

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

  protected setAddServerStep(step: 'choose' | 'template-list' | 'create' | 'join'): void {
    this.addServerStep.set(step);
    this.createErrorMessage.set(null);
    if (step === 'create' && !this.serverNameControl.value) {
      this.serverNameControl.reset('');
    }
  }

  protected chooseTemplate(template: ServerTemplate): void {
    this.selectedTemplate.set(template);
    this.addServerStep.set('create');
    this.createErrorMessage.set(null);
  }

  protected async submitCreateServer(): Promise<void> {
    if (this.serverNameControl.invalid || this.isSubmitting()) {
      this.serverNameControl.markAsTouched();
      return;
    }

    const serverName = this.serverNameControl.value.trim();
    if (serverName.length < 2) {
      this.serverNameControl.markAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.createErrorMessage.set(null);

    try {
      const template = this.selectedTemplate();
      const result = await this.serversApi.createServer(serverName, template.id);
      this.serversStore.upsertServerWithChannels(result.server, result.channels);
      // Nạp và refresh canonical capability ngay lập tức cho creator (không cần F5)
      void this.capabilitiesService.refresh(result.server.id);
      this.dialog.closeAll();

      // Điều hướng tới kênh chữ có position nhỏ nhất (hoặc kênh đầu tiên)
      const firstTextChannel = result.channels.find((c) => c.type === 'text') ?? result.channels[0];
      if (firstTextChannel) {
        await this.router.navigate(['/channels', result.server.id, firstTextChannel.id]);
      }
    } catch (err: unknown) {
      this.createErrorMessage.set(formatApiError(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected openCommandCenter(template: TemplateRef<unknown> = this.commandDialog()): void {
    this.commandQuery.set('');
    this.activeResultIndex.set(0);
    this.loadDmConversations();
    this.dialog.open(template, {
      ariaLabel: 'Điều hướng nhanh trong NexusCord',
      autoFocus: '.command-center__input',
      maxHeight: 'min(42rem, calc(100vh - 2rem))',
      maxWidth: '42rem',
      panelClass: 'nexus-add-server-dialog',
      restoreFocus: true,
      width: 'calc(100vw - 2rem)',
    });
  }

  private loadDmConversations(): void {
    this.conversationsApi
      .listConversations()
      .then((list) => {
        if (list) {
          this.dmConversations.set(list);
        }
      })
      .catch((err) => {
        console.warn('Không thể nạp danh sách cuộc trò chuyện cho Quick Switcher:', err);
      });
  }

  protected handleGlobalShortcut(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.draggingServerId()) {
        event.preventDefault();
        this.cancelDragSession();
        return;
      }
    }

    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') {
      return;
    }

    event.preventDefault();
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    this.openCommandCenter();
  }

  protected updateCommandQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.commandQuery.set(input?.value ?? '');
    this.activeResultIndex.set(0);
  }

  protected clearCommandQuery(): void {
    this.commandQuery.set('');
    this.activeResultIndex.set(0);
  }

  protected selectScopeChip(targetScope: CommandScope, inputEl?: HTMLInputElement): void {
    const current = this.parsedQuery();
    if (targetScope === 'all' || current.scope === targetScope) {
      this.commandQuery.set(current.searchTerm);
    } else {
      const prefix = SCOPE_TO_PREFIX[targetScope];
      this.commandQuery.set(current.searchTerm ? `${prefix} ${current.searchTerm}` : `${prefix} `);
    }
    this.activeResultIndex.set(0);
    if (inputEl) {
      inputEl.focus();
    }
  }

  protected handleCommandInputKeydown(event: KeyboardEvent): void {
    const results = this.commandResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) {
        this.activeResultIndex.update((i) => (i + 1) % results.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        this.activeResultIndex.update((i) => (i - 1 + results.length) % results.length);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const activeItem = results[this.activeResultIndex()];
      if (activeItem) {
        void this.selectResult(activeItem);
      }
      return;
    }
  }

  protected async selectResult(result: CommandResult, event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.dialog.closeAll();

    if (result.kind === 'conversation') {
      if (result.conversationId) {
        await this.router.navigate(['/channels', '@me', result.conversationId]);
        return;
      }
      if (result.userId) {
        try {
          const conv = await this.conversationsApi.getOrCreateDm(result.userId);
          await this.router.navigate(['/channels', '@me', conv.id]);
        } catch (err) {
          console.error('Không thể mở cuộc trò chuyện DM:', err);
          await this.router.navigate(['/channels', '@me']);
        }
        return;
      }
    }

    if (result.link) {
      await this.router.navigate(result.link);
    }
  }

  protected commandScopeLabel(scope: CommandScope): string {
    switch (scope) {
      case 'server':
        return 'máy chủ';
      case 'text-channel':
        return 'kênh chữ';
      case 'voice-channel':
        return 'kênh thoại';
      case 'conversation':
        return 'tin nhắn riêng';
      case 'all':
        return 'tổng hợp';
    }
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
        return 'Tin nhắn riêng';
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
    const first = this.serversStore.channelsOf(serverId)[0];
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

  private conversationCommand(friend: any): CommandResult {
    const displayName = friend.name || friend.displayName || friend.username || 'Người dùng';
    const existingConv = this.dmConversations().find(
      (c) => c.recipient?.id === friend.id,
    );

    return {
      id: `conversation-${friend.id}`,
      icon: 'alternate_email',
      kind: 'conversation',
      label: displayName,
      context: friend.statusMessage ?? (existingConv ? 'Mở cuộc trò chuyện' : 'Sẵn sàng kết nối'),
      link: existingConv ? ['/channels', '@me', existingConv.id] : undefined,
      userId: friend.id,
      conversationId: existingConv?.id,
      searchableText: `${displayName} ${friend.username ?? ''} ${friend.statusMessage ?? ''} bạn bè tin nhắn dm`,
    };
  }

  private normalizeSearch(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private commandScore(item: CommandResult, query: string): number {
    const label = this.normalizeSearch(item.label);
    const context = this.normalizeSearch(item.context);
    const searchable = this.normalizeSearch(item.searchableText);

    if (label === query) {
      return 0;
    }
    if (label.startsWith(query)) {
      return 1;
    }
    if (label.includes(query)) {
      return 2;
    }
    if (context.includes(query)) {
      return 3;
    }
    return searchable.includes(query) ? 4 : Number.POSITIVE_INFINITY;
  }
}
