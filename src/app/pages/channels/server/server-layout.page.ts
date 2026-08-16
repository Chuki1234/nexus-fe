import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { categoriesOf, findServer } from '../mock/chat-mock';
import { UserBarComponent } from '../ui/user-bar.component';

/** Cột kênh của một máy chủ + vùng nội dung bên phải. */
@Component({
  selector: 'app-server-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UserBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Xem ghi chú ở DmLayoutPage: thẻ tuỳ biến mặc định display:inline nên phải
  // tự khai báo, không thì cột kênh và khung chat không đứng cạnh nhau.
  host: { class: 'flex min-w-0 flex-1' },
  templateUrl: './server-layout.page.html',
})
export class ServerLayoutPage {
  private readonly route = inject(ActivatedRoute);

  private readonly serverId = signal<string | null>(null);

  protected readonly server = computed(() => findServer(this.serverId()));
  protected readonly categories = computed(() => categoriesOf(this.serverId()));

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('serverId')),
        takeUntilDestroyed(),
      )
      .subscribe((id) => this.serverId.set(id));
  }
}
