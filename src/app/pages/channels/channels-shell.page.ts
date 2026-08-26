import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProfileCardComponent } from '../../shared/ui/profile-card/profile-card.component';
import { ProfileModalComponent } from '../../shared/ui/profile-card/profile-modal.component';
import { ServerRailComponent } from './ui/server-rail.component';

/**
 * Vỏ ngoài cùng: dải máy chủ cố định bên trái, phần còn lại do route con vẽ.
 *
 * Dải máy chủ nằm ở đây chứ không nằm trong từng layout con để nó không bị dựng
 * lại mỗi lần chuyển máy chủ — đó là thứ luôn hiện, không phụ thuộc đang ở đâu.
 */
@Component({
  selector: 'app-channels-shell',
  imports: [RouterOutlet, ServerRailComponent, ProfileCardComponent, ProfileModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-dvh overflow-hidden bg-canvas">
      <app-server-rail />
      <router-outlet />
    </div>

    <!-- Hai kiểu hiện hồ sơ, cùng một nguồn trạng thái, mỗi lúc chỉ một cái dựng:
         thẻ nhỏ dính vào avatar khi xem người khác giữa lúc đọc chat, và cửa sổ
         giữa màn hình khi bấm avatar của chính mình.

         Cả hai đặt ngoài khung flex ở trên để position:fixed của chúng không bị
         cột nào có overflow cắt mất. -->
    <app-profile-card />
    <app-profile-modal />
  `,
})
export class ChannelsShellPage {}
