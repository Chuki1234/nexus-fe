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
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

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
  type ConversationSummary,
  type ServerGroupSummary,
  type ServerSummary,
  ShellData,
} from '../../../../core/api/shell-data';

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

export interface CommandResult {
  id: string;
  icon: string;
  kind: 'server' | 'text-channel' | 'voice-channel' | 'conversation';
  label: string;
  context: string;
  link: string[];
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

type GroupingTargetKind = 'folder' | 'server';

import { ServerCapabilitiesService } from '../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../core/servers/servers.store';

/**
 * Cột 1 — dải icon server dọc mép trái chuẩn Discord.
 * Tái thiết kế toàn diện theo đặc tả Drag & Drop và Folder System.
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
export class ServerRail {
  private readonly shell = inject(ShellData);
  private readonly serversStore = inject(ServersStore);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly dialog = inject(MatDialog);
  private readonly serversApi = inject(ServersApiService);
  private readonly router = inject(Router);
  private readonly commandDialog = viewChild.required<TemplateRef<unknown>>('commandDialog');

  protected readonly servers = this.serversStore.servers;
  protected readonly serverGroups = this.shell.serverGroups;
  protected readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());

  /** Một intent tại một thời điểm: group target hoặc insertion slot. */
  protected readonly draggingServerId = signal<string | null>(null);
  protected readonly activeDropSlot = signal<string | null>(null);
  protected readonly activeGroupingTarget = signal<string | null>(null);
  private folderOpenTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly draggingServer = computed(() => {
    const serverId = this.draggingServerId();
    return serverId ? (this.servers().find((server) => server.id === serverId) ?? null) : null;
  });

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
      this.shell.channelsOf(server.id).map((channel) => this.channelCommand(server, channel)),
    );
    const conversationItems = this.shell
      .conversations()
      .map((conversation) => this.conversationCommand(conversation));

    return [...conversationItems, ...serverItems, ...channelItems];
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
            : 'Thêm máy chủ, kết bạn hoặc bật dữ liệu demo để xem Quick Switcher hoạt động.',
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
    this.activeGroupingTarget.set(this.groupingTargetId(kind, targetId));

    if (kind === 'folder' && this.collapsedGroups().has(targetId)) {
      this.clearFolderOpenTimer();
      this.folderOpenTimer = setTimeout(() => {
        if (this.groupingTargetIsActive('folder', targetId)) {
          this.collapsedGroups.update((collapsed) => {
            const next = new Set(collapsed);
            next.delete(targetId);
            return next;
          });
        }
      }, 650);
    }
  }

  protected deactivateGroupingTarget(kind: GroupingTargetKind, targetId: string): void {
    const target = this.groupingTargetId(kind, targetId);
    if (this.activeGroupingTarget() === target) {
      this.activeGroupingTarget.set(null);
    }
    if (kind === 'folder') {
      this.clearFolderOpenTimer();
    }
  }

  protected groupingTargetIsActive(kind: GroupingTargetKind, targetId: string): boolean {
    return this.activeGroupingTarget() === this.groupingTargetId(kind, targetId);
  }

  protected groupIsReceiving(groupId: string): boolean {
    const target = this.activeGroupingTarget();
    if (target === this.groupingTargetId('folder', groupId)) {
      return true;
    }

    const group = this.serverGroups().find((candidate) => candidate.id === groupId);
    return !!group?.serverIds.some(
      (serverId) => target === this.groupingTargetId('server', serverId),
    );
  }

  protected activateDropSlot(slotId: string): void {
    if (!this.draggingServerId()) {
      return;
    }
    this.clearFolderOpenTimer();
    this.activeGroupingTarget.set(null);
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

  protected dropOnServer(event: CdkDragDrop<string, string, string>, targetServerId: string): void {
    const sourceServerId = event.item.data || this.draggingServerId();
    const canDrop =
      event.isPointerOverContainer &&
      !!sourceServerId &&
      this.canGroupWithTarget(sourceServerId, 'server', targetServerId);
    this.clearDropFeedback();

    if (!canDrop || !sourceServerId) {
      return;
    }

    const targetWasGrouped = this.serverGroups().some((group) =>
      group.serverIds.includes(targetServerId),
    );
    const groupId = this.shell.groupServers(sourceServerId, targetServerId);
    if (groupId && !targetWasGrouped) {
      this.collapsedGroups.update((collapsed) => new Set(collapsed).add(groupId));
    }
  }

  protected dropOnGroup(event: CdkDragDrop<string, string, string>, targetGroupId: string): void {
    const sourceServerId = event.item.data || this.draggingServerId();
    const canDrop =
      event.isPointerOverContainer &&
      !!sourceServerId &&
      this.canGroupWithTarget(sourceServerId, 'folder', targetGroupId);
    this.clearDropFeedback();

    if (canDrop && sourceServerId) {
      this.shell.addServerToGroup(sourceServerId, targetGroupId);
    }
  }

  protected dropIntoGroupAt(
    event: CdkDragDrop<string, string, string>,
    targetGroupId: string,
    insertionIndex: number,
  ): void {
    const sourceServerId = event.item.data || this.draggingServerId();
    this.clearDropFeedback();
    if (event.isPointerOverContainer && sourceServerId) {
      this.shell.moveServerToGroup(sourceServerId, targetGroupId, insertionIndex);
    }
  }

  protected dropOutsideGroupsAt(
    event: CdkDragDrop<string, string, string>,
    insertionIndex: number,
  ): void {
    const sourceServerId = event.item.data || this.draggingServerId();
    this.clearDropFeedback();
    if (event.isPointerOverContainer && sourceServerId) {
      this.shell.moveServerOutsideGroups(sourceServerId, insertionIndex);
    }
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
      this.shell.upsertServerWithChannels(result.server, result.channels);
      // Nạp và refresh canonical capability ngay lập tức cho creator (không cần F5)
      void this.capabilitiesService.refresh(result.server.id);
      if (this.shell.demoEnabled()) {
        this.shell.setDemoEnabled(false);
      }
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

  protected handleGlobalShortcut(event: KeyboardEvent): void {
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
    this.commandQuery.set((event.target as HTMLInputElement | null)?.value ?? '');
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
        this.selectResult(activeItem);
      }
      return;
    }
  }

  protected async selectResult(result: CommandResult): Promise<void> {
    this.dialog.closeAll();
    await this.router.navigate(result.link);
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

  private canGroupWithTarget(
    sourceServerId: string,
    kind: GroupingTargetKind,
    targetId: string,
  ): boolean {
    if (kind === 'folder') {
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
    return `${kind}:${targetId}`;
  }

  private clearFolderOpenTimer(): void {
    if (this.folderOpenTimer !== null) {
      clearTimeout(this.folderOpenTimer);
      this.folderOpenTimer = null;
    }
  }

  private clearDropFeedback(): void {
    this.clearFolderOpenTimer();
    this.activeDropSlot.set(null);
    this.activeGroupingTarget.set(null);
  }
}
