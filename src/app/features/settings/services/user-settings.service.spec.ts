import { TestBed } from '@angular/core/testing';
import { UserSettingsService } from './user-settings.service';
import { ProfileService } from '../../../core/profile/profile.service';
import { ProfilePendingImages } from '../../profile/pending-images';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let profileStub: { current: () => unknown };

  beforeEach(() => {
    profileStub = {
      current: () => ({
        id: 'u-test',
        username: 'admin_nexus',
        displayName: 'Admin Nexus',
        email: 'admin@nexus.com',
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        UserSettingsService,
        { provide: ProfileService, useValue: profileStub },
      ],
    });

    service = TestBed.inject(UserSettingsService);
  });

  it('khởi tạo mặc định ở trạng thái đóng', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('mở cài đặt chuyển isOpen thành true và đặt tab đúng', () => {
    service.open('appearance');
    expect(service.isOpen()).toBe(true);
    expect(service.currentTab()).toBe('appearance');
  });

  it('đóng cài đặt chuyển isOpen thành false', () => {
    service.open('voice-video');
    expect(service.isOpen()).toBe(true);
    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('cập nhật preference thành công', () => {
    service.updatePreference('theme', 'midnight-dark');
    expect(service.preferences().theme).toBe('midnight-dark');

    service.updatePreference('fontSize', 18);
    expect(service.preferences().fontSize).toBe(18);
  });

  it('phát hiện thay đổi chưa lưu và khôi phục khi resetChanges', () => {
    service.open('profile');
    expect(service.hasUnsavedChanges()).toBe(false);

    service.editDisplayName.set('Tên Mới Được Sửa');
    expect(service.hasUnsavedChanges()).toBe(true);

    service.resetChanges();
    expect(service.hasUnsavedChanges()).toBe(false);
    expect(service.editDisplayName()).not.toBe('Tên Mới Được Sửa');
  });

  it('ảnh và màu sắc chọn dở cũng tính là thay đổi chưa lưu', () => {
    service.open('profile');
    expect(service.hasUnsavedChanges()).toBe(false);

    service.editAvatarUrl.set('https://x/new-avatar.webp');
    expect(service.hasUnsavedChanges()).toBe(true);

    service.resetChanges();
    expect(service.hasUnsavedChanges()).toBe(false);
  });

  it('đóng cài đặt và resetChanges khôi phục trạng thái ban đầu', () => {
    service.open('profile');
    service.editBannerColor.set('#ff0000');
    expect(service.hasUnsavedChanges()).toBe(true);

    service.resetChanges();
    expect(service.hasUnsavedChanges()).toBe(false);
    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('tính toán đúng phân quyền server theo vai trò', () => {
    // Tài khoản admin_nexus ở itss có toàn quyền quản trị
    expect(service.canAccessServerSettings('itss')).toBe(true);
    expect(service.canManageOverview('itss')).toBe(true);
    expect(service.canManageRoles('itss')).toBe(true);
    expect(service.canManageMembers('itss')).toBe(true);
    expect(service.hasPermissionForTab('server-roles', 'itss')).toBe(true);

    // Ở server khác (xp), admin_nexus chỉ là member thường -> ẩn hoàn toàn
    expect(service.canAccessServerSettings('xp')).toBe(false);
    expect(service.canManageOverview('xp')).toBe(false);
    expect(service.canManageRoles('xp')).toBe(false);
    expect(service.canManageMembers('xp')).toBe(false);
    expect(service.hasPermissionForTab('server-roles', 'xp')).toBe(false);
    expect(service.hasPermissionForTab('account')).toBe(true); // tab cá nhân luôn vào được
  });

  it('gắn đúng dữ liệu và quyền riêng cho từng server (ITSS Lab vs Xp Community)', () => {
    // ITSS Lab: admin có quyền quản trị
    service.openServerSettings('server-overview', 'itss');
    expect(service.currentServerData().name).toBe('ITSS Lab');
    expect(service.currentServerData().initials).toBe('ITSS');

    // Xp Community: tài khoản này chỉ là member, không có quyền admin
    expect(service.canAccessServerSettings('xp')).toBe(false);
    expect(service.canManageOverview('xp')).toBe(false);

    // Mở server settings của Xp Community
    service.openServerSettings('server-overview', 'xp');
    expect(service.currentServerData().name).toBe('Xp Community');
    expect(service.currentServerData().initials).toBe('XC');
  });

  it('xp_admin chỉ có quyền ở XP Community, các server khác (Lofi Study, ITSS Lab, Peak Design) bị ẩn hoàn toàn', () => {
    profileStub.current = () => ({
      id: 'u-xp-admin',
      username: 'xp_admin',
      displayName: 'XP Admin',
      email: 'xp_admin@nexus.com',
    });

    // XP Community: Có quyền
    expect(service.canAccessServerSettings('xp')).toBe(true);
    expect(service.canManageOverview('xp')).toBe(true);

    // Lofi Study: BỊ ẨN HOÀN TOÀN
    expect(service.canAccessServerSettings('lofi')).toBe(false);
    expect(service.canManageOverview('lofi')).toBe(false);

    // ITSS Lab: BỊ ẨN HOÀN TOÀN
    expect(service.canAccessServerSettings('itss')).toBe(false);
    expect(service.canManageOverview('itss')).toBe(false);

    // Peak Design: BỊ ẨN HOÀN TOÀN
    expect(service.canAccessServerSettings('peak')).toBe(false);
    expect(service.canManageOverview('peak')).toBe(false);
  });
});
