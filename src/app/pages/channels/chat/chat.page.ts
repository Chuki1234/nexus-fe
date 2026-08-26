import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { PresenceDotComponent } from '../../../shared/ui/presence-dot.component';
import { ProfileBodyComponent } from '../../../shared/ui/profile-card/profile-body.component';
import { ProfileCardService } from '../../../shared/ui/profile-card/profile-card.service';
import {
  CURRENT_USER_ID,
  findChannel,
  findDmPartner,
  findMember,
  findServer,
  MOCK_DM_MESSAGES,
  MOCK_MEMBERS,
  MOCK_MESSAGES,
  MockMember,
  MockMessage,
  relativeTime,
} from '../mock/chat-mock';

/** Một dòng tin đã ghép sẵn tác giả, để template không phải tra cứu. */
interface ChatRow {
  id: string;
  author: MockMember | null;
  isMine: boolean;
  body: string;
  time: string;
  /** True khi tin này nối tiếp tin trước của cùng người — ẩn avatar và tên. */
  grouped: boolean;
}

/**
 * BẢN MẪU khung chat, dùng cho cả kênh máy chủ và tin nhắn riêng.
 *
 * Hai thứ này khác nhau ở phần đầu trang (tên kênh vs tên người) nhưng phần thân
 * hoàn toàn giống: danh sách tin + ô soạn. Tách hai component sẽ phải sửa cả hai
 * mỗi lần đụng tới cách hiển thị tin nhắn.
 *
 * Tin gửi đi chỉ nằm trong bộ nhớ trang: chưa có backend, và cũng chưa có kênh
 * realtime nào để tin đó tới được người khác.
 */
@Component({
  selector: 'app-chat-page',
  imports: [
    AvatarComponent,
    PresenceDotComponent,
    ProfileBodyComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Khung chat và bảng hồ sơ bên phải là hai con trực tiếp của thẻ này, nên chính
  // thẻ này phải là flex container — và là flex item co giãn được của layout cha.
  host: { class: 'flex min-w-0 flex-1' },
  templateUrl: './chat.page.html',
})
export class ChatPage {
  private readonly route = inject(ActivatedRoute);
  private readonly cards = inject(ProfileCardService);

  /** Tin do người dùng gõ trong phiên này, nối vào cuối danh sách giả. */
  private readonly sent = signal<MockMessage[]>([]);

  protected readonly draft = new FormControl('', { nonNullable: true });

  private readonly params = signal<{
    serverId: string | null;
    channelId: string | null;
    dmId: string | null;
  }>({
    serverId: null,
    channelId: null,
    dmId: null,
  });

  protected readonly isDirectMessage = computed(() => this.params().dmId !== null);

  protected readonly channel = computed(() => {
    const { serverId, channelId } = this.params();
    return findChannel(serverId, channelId);
  });

  /** Người ở đầu bên kia; có cả khi hai người chưa từng nhắn nhau. */
  protected readonly partner = computed(() => findDmPartner(this.params().dmId));

  /** Tiêu đề đầu trang: `#tên-kênh` hoặc tên người đối thoại. */
  protected readonly title = computed(() => {
    const partner = this.partner();
    if (partner) {
      return partner.displayName;
    }
    return this.channel()?.name ?? '';
  });

  protected readonly topic = computed(() => this.channel()?.topic ?? '');

  protected readonly members = MOCK_MEMBERS;

  /** Máy chủ đang xem — `null` khi đang ở tin nhắn riêng. */
  private readonly serverName = computed(() => findServer(this.params().serverId)?.name ?? null);

  protected readonly rows = computed<ChatRow[]>(() => {
    const { channelId, dmId } = this.params();
    const base = dmId ? (MOCK_DM_MESSAGES[dmId] ?? []) : (MOCK_MESSAGES[channelId ?? ''] ?? []);
    const all = [...base, ...this.sent()];

    return all.map((message, index) => {
      const previous = all[index - 1];
      return {
        id: message.id,
        author: message.authorId === CURRENT_USER_ID ? null : findMember(message.authorId),
        isMine: message.authorId === CURRENT_USER_ID,
        body: message.body,
        time: relativeTime(message.minutesAgo),
        // Gộp khi cùng người và cách nhau dưới 10 phút — nhiều tin liền nhau của
        // một người mà lặp lại avatar + tên thì rất khó đọc.
        grouped:
          previous !== undefined &&
          previous.authorId === message.authorId &&
          Math.abs(previous.minutesAgo - message.minutesAgo) < 10,
      };
    });
  });

  constructor() {
    // `:serverId` ở route ông, `:channelId` ở route này, `:dmId` cũng vậy — gộp
    // cả hai nguồn lại rồi mới đọc, thay vì tự đoán mình đang nằm ở nhánh nào.
    combineLatest([this.route.paramMap, this.route.parent?.paramMap ?? this.route.paramMap])
      .pipe(
        map(([own, parent]) => ({
          serverId: parent.get('serverId'),
          channelId: own.get('channelId'),
          dmId: own.get('dmId'),
        })),
        takeUntilDestroyed(),
      )
      .subscribe((params) => {
        this.params.set(params);
        // Đổi phòng thì bỏ luôn tin đã gõ trong phòng cũ, kẻo chúng hiện lại ở
        // một cuộc trò chuyện chẳng liên quan.
        this.sent.set([]);
        this.draft.setValue('', { emitEvent: false });
      });
  }

  /**
   * Mở thẻ hồ sơ neo vào chính nút vừa bấm.
   *
   * `currentTarget` chứ không phải `target`: người dùng bấm trúng ảnh hoặc chữ
   * bên trong nút, `target` sẽ là phần tử con đó và thẻ neo lệch đi.
   */
  protected openCard(member: MockMember, event: Event): void {
    // Gắn tên máy chủ đang xem vào member: vai trò chỉ có nghĩa TRONG một máy
    // chủ. "Điều hành viên" trần trụi thì người xem không biết điều hành ở đâu,
    // mà cùng một người có thể mang vai trò khác nhau ở mỗi máy chủ. Ở tin nhắn
    // riêng thì `serverName` là null và thẻ giấu luôn mục Vai trò.
    this.cards.toggle(
      { ...member, roleServer: this.serverName() },
      event.currentTarget as HTMLElement,
    );
  }

  protected onSend(): void {
    const body = this.draft.value.trim();
    if (!body) {
      return;
    }
    this.sent.update((current) => [
      ...current,
      { id: `sent-${current.length}`, authorId: CURRENT_USER_ID, body, minutesAgo: 0 },
    ]);
    this.draft.setValue('');
  }

  /** Enter gửi, Shift+Enter xuống dòng — đúng thói quen của ứng dụng chat. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
}
