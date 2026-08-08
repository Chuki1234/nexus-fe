import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { DashboardUiStateName } from '../../services/dashboard-ui-state';

export type DashboardStateLayout = 'list' | 'chat' | 'generic';
type VisibleDashboardState = Exclude<DashboardUiStateName, 'ready'>;

interface StateCopy {
  icon: string;
  title: string;
  message: string;
  action: string | null;
}

const STATE_COPY: Record<VisibleDashboardState, StateCopy> = {
  loading: {
    icon: 'progress_activity',
    title: 'Đang sắp xếp không gian của bạn',
    message: 'NexusCord đang tải dữ liệu mới nhất.',
    action: null,
  },
  error: {
    icon: 'sync_problem',
    title: 'Chưa tải được dữ liệu',
    message: 'Kết nối gặp sự cố. Nội dung của bạn vẫn an toàn.',
    action: 'Thử lại',
  },
  offline: {
    icon: 'cloud_off',
    title: 'Bạn đang ngoại tuyến',
    message: 'Nội dung đang mở vẫn xem được. Thao tác mới sẽ chờ khi có mạng.',
    action: 'Thử lại',
  },
  reconnecting: {
    icon: 'sync',
    title: 'Đang kết nối lại',
    message: 'NexusCord đang nối lại luồng cập nhật. Bạn không cần tải lại trang.',
    action: 'Ẩn',
  },
  forbidden: {
    icon: 'lock',
    title: 'Bạn chưa có quyền xem',
    message: 'Kênh này có thể riêng tư hoặc quyền truy cập của bạn đã thay đổi.',
    action: 'Quay lại',
  },
  missing: {
    icon: 'search_off',
    title: 'Nội dung không còn ở đây',
    message: 'Cuộc trò chuyện hoặc kênh này có thể đã được di chuyển hay xoá.',
    action: 'Quay lại',
  },
};

@Component({
  selector: 'app-dashboard-state',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0' },
  templateUrl: './dashboard-state.html',
  styleUrl: './dashboard-state.css',
})
export class DashboardState {
  readonly state = input.required<VisibleDashboardState>();
  readonly layout = input<DashboardStateLayout>('generic');
  readonly action = output<void>();

  protected readonly skeletonRows = [0, 1, 2, 3, 4];
  protected readonly copy = computed(() => STATE_COPY[this.state()]);
  protected readonly isLoading = computed(() => this.state() === 'loading');
  protected readonly isBanner = computed(
    () => this.state() === 'offline' || this.state() === 'reconnecting',
  );
}
