import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { DashboardState } from '../components/dashboard-state/dashboard-state';
import { DashboardUiState } from '../services/dashboard-ui-state';

/**
 * `/channels/:serverId` — đã chọn server nhưng chưa chọn kênh.
 *
 * Xảy ra khi người dùng gõ thẳng URL, hoặc khi server không có kênh nào. Cột 2
 * vẫn hiện danh sách kênh bình thường, chỉ khu nội dung là rỗng.
 */
@Component({
  selector: 'app-server-home-page',
  imports: [DashboardState, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  templateUrl: './server-home.html',
  styleUrl: './server-home.css',
})
export class ServerHomePage {
  private readonly uiState = inject(DashboardUiState);

  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }
}
