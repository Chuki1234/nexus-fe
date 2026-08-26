import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ToggleSwitchComponent } from '../../../shared/ui/toggle-switch.component';
import { MOCK_ROLES, MockRole, PERMISSION_GROUPS, PermissionKey } from '../mock/settings-mock';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/**
 * BẢN MẪU phân quyền, dùng chung cho cả máy chủ và kênh.
 *
 * Hai nơi có cùng một mô hình (vai trò → tập quyền), chỉ khác tập quyền nào có ý
 * nghĩa ở phạm vi nào; tách thành hai component sẽ phải sửa hai chỗ mỗi lần thêm
 * một quyền mới. `scope` lấy từ dữ liệu route.
 *
 * Bản thật: các khoá quyền ở đây ánh xạ thẳng sang subject/action của CASL bên
 * backend, và câu trả lời cuối cùng phải do backend quyết — bật/tắt ở client chỉ
 * là ẩn hiện nút, không phải hàng rào.
 */
@Component({
  selector: 'app-settings-roles',
  imports: [SettingsSectionComponent, ToggleSwitchComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roles.page.html',
})
export class RolesPage {
  private readonly route = inject(ActivatedRoute);

  /** 'server' | 'channel' — quyết định tập quyền nào hiện ra. */
  protected readonly scope = this.route.snapshot.data['scope'] as 'server' | 'channel';

  /** Bản sao để sửa trong bộ nhớ, không đụng vào hằng số dùng chung. */
  protected readonly roles = signal<MockRole[]>(
    MOCK_ROLES.map((role) => ({ ...role, permissions: [...role.permissions] })),
  );

  protected readonly selectedId = signal<string>(MOCK_ROLES[0].id);

  protected readonly selected = computed(
    () => this.roles().find((role) => role.id === this.selectedId()) ?? null,
  );

  /**
   * Ở phạm vi kênh, các quyền cấp máy chủ không có nghĩa gì nên bị lọc bỏ —
   * hiện chúng ra sẽ khiến người dùng tưởng sửa được cài đặt máy chủ từ trong kênh.
   */
  protected readonly groups = computed(() =>
    PERMISSION_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter(
        (permission) => this.scope === 'server' || !permission.key.startsWith('server.'),
      ),
    })).filter((group) => group.permissions.length > 0),
  );

  protected has(key: PermissionKey): boolean {
    return this.selected()?.permissions.includes(key) ?? false;
  }

  protected toggle(key: PermissionKey, enabled: boolean): void {
    const id = this.selectedId();
    this.roles.update((roles) =>
      roles.map((role) => {
        if (role.id !== id) {
          return role;
        }
        const permissions = enabled
          ? [...new Set([...role.permissions, key])]
          : role.permissions.filter((existing) => existing !== key);
        return { ...role, permissions };
      }),
    );
  }
}
