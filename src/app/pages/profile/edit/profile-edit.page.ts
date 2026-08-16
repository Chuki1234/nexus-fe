import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ProfileApiService,
  ProfileImageKind,
  toProfileErrorMessage,
  validateImageFile,
} from '../../../core/profile/profile-api.service';
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  IMAGE_ACCEPT_ATTRIBUTE,
  LINK_LABEL_MAX,
  LINK_URL_MAX,
  LINK_URL_PATTERN,
  LOCATION_MAX,
  MAX_PROFILE_LINKS,
  OwnProfile,
  profileDisplayName,
  ProfileLink,
  STATUS_MESSAGE_MAX,
} from '../../../core/profile/profile.models';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { bannerFallback, BANNER_FALLBACKS } from '../../../shared/ui/profile-card/banner-color';
import { ProfilePreviewCardComponent } from '../../../shared/ui/profile-card/profile-preview-card.component';

type LinkFormGroup = FormGroup<{
  label: FormControl<string>;
  url: FormControl<string>;
}>;

/**
 * `/settings/profile` — sửa hồ sơ của chính mình.
 *
 * Ảnh và phần chữ đi hai đường khác nhau: ảnh gửi ngay khi chọn (multipart, một
 * request riêng), phần chữ chỉ gửi khi bấm Lưu. Gộp chung thì mỗi lần đổi một ô
 * chữ lại phải tải lại cả ảnh.
 */
@Component({
  selector: 'app-profile-edit-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AvatarComponent,
    ProfilePreviewCardComponent,
    TranslatePipe,
  ],
  templateUrl: './profile-edit.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEditPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly api = inject(ProfileApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly profile = signal<OwnProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Lỗi riêng của khối ảnh — không lẫn với lỗi lưu phần chữ. */
  protected readonly imageError = signal<string | null>(null);
  /** Loại ảnh đang có request chạy dở, để khoá đúng khối đó. */
  protected readonly busyImage = signal<ProfileImageKind | null>(null);
  /** `null` = tự động theo username. Không nằm trong `form`: đây không phải ô
   *  chữ mà là một lựa chọn từ bảng màu cố định, gửi cùng lúc với phần chữ khi
   *  bấm Lưu. */
  protected readonly selectedAccent = signal<string | null>(null);
  protected readonly accentColors = BANNER_FALLBACKS;

  protected readonly form = this.formBuilder.group({
    displayName: ['', [Validators.maxLength(DISPLAY_NAME_MAX)]],
    statusMessage: ['', [Validators.maxLength(STATUS_MESSAGE_MAX)]],
    bio: ['', [Validators.maxLength(BIO_MAX)]],
    location: ['', [Validators.maxLength(LOCATION_MAX)]],
    links: this.formBuilder.array<LinkFormGroup>([]),
  });

  protected readonly displayNameMax = DISPLAY_NAME_MAX;
  protected readonly statusMessageMax = STATUS_MESSAGE_MAX;
  protected readonly bioMax = BIO_MAX;
  protected readonly locationMax = LOCATION_MAX;
  protected readonly linkLabelMax = LINK_LABEL_MAX;
  protected readonly linkUrlMax = LINK_URL_MAX;
  protected readonly maxLinks = MAX_PROFILE_LINKS;
  protected readonly imageAccept = IMAGE_ACCEPT_ATTRIBUTE;

  /** Số ký tự còn lại cho hai ô dễ chạm trần nhất. */
  protected readonly displayNameValue = toSignal(this.form.controls.displayName.valueChanges, {
    initialValue: '',
  });
  protected readonly statusValue = toSignal(this.form.controls.statusMessage.valueChanges, {
    initialValue: '',
  });
  protected readonly bioValue = toSignal(this.form.controls.bio.valueChanges, {
    initialValue: '',
  });
  protected readonly locationValue = toSignal(this.form.controls.location.valueChanges, {
    initialValue: '',
  });
  protected readonly linksValue = toSignal(this.form.controls.links.valueChanges, {
    initialValue: [],
  });

  protected readonly statusRemaining = computed(
    () => STATUS_MESSAGE_MAX - (this.statusValue() || '').length,
  );
  protected readonly bioRemaining = computed(() => BIO_MAX - (this.bioValue() || '').length);

  protected readonly name = computed(() => {
    const profile = this.profile();
    return profile ? profileDisplayName(profile) : '';
  });

  protected readonly previewName = computed(() => {
    const custom = this.displayNameValue()?.trim();
    if (custom) return custom;
    return this.name() || 'Tên hiển thị';
  });

  /** Dùng cho ô "Ảnh bìa" bên khối tải ảnh — riêng với màu trong thẻ xem trước
   *  (ProfilePreviewCardComponent tự tính lấy màu của chính nó từ input). */
  protected readonly bannerColorPreview = computed(() => {
    const username = this.profile()?.username;
    return username ? bannerFallback(username, this.selectedAccent()) : '#1a1a1a';
  });

  constructor() {
    void this.load();

    // Gỡ báo "Đã lưu" ngay khi người dùng sửa tiếp, kẻo dòng chữ đó nói về thay
    // đổi cũ trong lúc màn hình đang có thay đổi mới chưa lưu.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saved.set(false));
  }

  protected get links(): FormArray<LinkFormGroup> {
    return this.form.controls.links;
  }

  protected addLink(): void {
    if (this.links.length < MAX_PROFILE_LINKS) {
      this.links.push(this.linkGroup());
    }
  }

  protected removeLink(index: number): void {
    this.links.removeAt(index);
    this.links.markAsDirty();
  }

  protected showError(field: 'displayName' | 'statusMessage' | 'bio' | 'location'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected showLinkError(index: number, field: 'label' | 'url'): boolean {
    const control = this.links.at(index).controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  /** `null` = "Tự động", tự đứng cùng hàng với 8 màu trong radiogroup. */
  protected selectAccent(color: string | null): void {
    this.selectedAccent.set(color);
    this.saved.set(false);
  }

  /**
   * Ảnh gửi lên ngay khi chọn. Xoá `input.value` sau đó để chọn lại đúng file cũ
   * vẫn bắn `change` — nếu không, thử lại sau một lần lỗi sẽ im lặng không làm gì.
   */
  protected async onPickImage(kind: ProfileImageKind, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || this.busyImage()) {
      return;
    }

    const invalid = validateImageFile(file);
    if (invalid) {
      this.imageError.set(invalid);
      return;
    }

    this.imageError.set(null);
    this.busyImage.set(kind);
    try {
      this.profile.set(await this.api.uploadImage(kind, file));
    } catch (error) {
      this.imageError.set(toProfileErrorMessage(error));
    } finally {
      this.busyImage.set(null);
    }
  }

  protected async onRemoveImage(kind: ProfileImageKind): Promise<void> {
    if (this.busyImage()) {
      return;
    }
    this.imageError.set(null);
    this.busyImage.set(kind);
    try {
      this.profile.set(await this.api.removeImage(kind));
    } catch (error) {
      this.imageError.set(toProfileErrorMessage(error));
    } finally {
      this.busyImage.set(null);
    }
  }

  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.saved.set(false);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) {
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    try {
      // Chuỗi rỗng được backend hiểu là "xoá trường này" (xem UpdateProfileDto),
      // nên không cần tự đổi thành null ở đây.
      const updated = await this.api.update({
        displayName: raw.displayName,
        statusMessage: raw.statusMessage,
        bio: raw.bio,
        location: raw.location,
        accentColor: this.selectedAccent(),
        links: raw.links.map((link) => ({ label: link.label, url: link.url })),
      });
      this.profile.set(updated);
      this.form.markAsPristine();
      this.submitted.set(false);
      this.saved.set(true);
    } catch (error) {
      this.errorMessage.set(toProfileErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      const profile = await this.api.getOwn();
      this.profile.set(profile);
      this.fillForm(profile);
    } catch (error) {
      // 404 ở đây nghĩa là tài khoản chưa qua bước hoàn tất hồ sơ. `profileGuard`
      // đã lo trường hợp đó, nên tới được đây chỉ còn lỗi mạng/máy chủ thật sự.
      this.errorMessage.set(toProfileErrorMessage(error));
    } finally {
      this.loading.set(false);
      this.focusFragment();
    }
  }

  private fillForm(profile: OwnProfile): void {
    this.form.patchValue({
      displayName: profile.displayName ?? '',
      statusMessage: profile.statusMessage ?? '',
      bio: profile.bio ?? '',
      location: profile.location ?? '',
    });
    this.selectedAccent.set(profile.accentColor);

    this.links.clear();
    for (const link of profile.links) {
      this.links.push(this.linkGroup(link));
    }
  }

  /**
   * Nhảy tiêu điểm vào đúng ô khi tới từ nút "Thêm ngay" của `EmptyFieldComponent`
   * (route có #fragment, ví dụ `/settings/profile#bio`). `setTimeout` thay vì gọi
   * ngay: view đổi từ `loading()` sang nhánh có form vẫn cần một tick CD của
   * OnPush để phần tử thật sự có mặt trong DOM.
   */
  private focusFragment(): void {
    const fragment = this.route.snapshot.fragment;
    if (!fragment || typeof document === 'undefined') {
      return;
    }
    setTimeout(() => {
      if (fragment === 'links') {
        document.getElementById('links-heading')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }
      document.getElementById(fragment)?.focus();
    }, 0);
  }

  private linkGroup(link?: ProfileLink): LinkFormGroup {
    return this.formBuilder.group({
      label: [link?.label ?? '', [Validators.required, Validators.maxLength(LINK_LABEL_MAX)]],
      url: [
        link?.url ?? '',
        [
          Validators.required,
          Validators.maxLength(LINK_URL_MAX),
          Validators.pattern(LINK_URL_PATTERN),
        ],
      ],
    });
  }
}
