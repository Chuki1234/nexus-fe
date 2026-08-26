import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  StipopApiService,
  type StipopPackageSummary,
} from '../../../../core/api/stipop-api.service';
import { ExternalMediaDto } from '../../../../../shared/dto/messages.dto';

@Component({
  selector: 'app-stipop-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stipop-picker.component.html',
  styleUrl: './stipop-picker.component.scss',
})
export class StipopPickerComponent implements OnInit {
  private readonly stipopApi = inject(StipopApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);

  @Output() readonly stickerSelected = new EventEmitter<ExternalMediaDto>();
  @Output() readonly closePicker = new EventEmitter<void>();

  @ViewChild('searchInput') private readonly searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('chipsContainer') private readonly chipsContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('packsContainer') private readonly packsContainerRef?: ElementRef<HTMLDivElement>;

  readonly searchQuery = signal('');
  readonly stickers = signal<ExternalMediaDto[]>([]);
  readonly packages = signal<StipopPackageSummary[]>([]);
  readonly activePackageId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly failedStickerIds = signal<ReadonlySet<string>>(new Set());
  readonly failedPackageIds = signal<ReadonlySet<number>>(new Set());

  readonly quickCategories = [
    { label: '🔥 Thịnh hành', query: '' },
    { label: '🥰 Dễ thương', query: 'cute' },
    { label: '🐱 Mèo', query: 'cat' },
    { label: '❤️ Yêu thích', query: 'love' },
    { label: '😂 Hài hước', query: 'funny' },
    { label: '🎉 Vui mừng', query: 'happy' },
    { label: '😭 Buồn khóc', query: 'sad' },
    { label: '🐶 Chó cưng', query: 'dog' },
    { label: '✨ Chúc mừng', query: 'congrats' },
  ];
  readonly selectedCategory = signal<string>('');

  private readonly searchSubject$ = new Subject<string>();

  selectCategory(cat: { label: string; query: string }): void {
    this.selectedCategory.set(cat.query);
    this.activePackageId.set(null);
    this.onSearchChange(cat.query);
  }

  onChipsWheel(event: WheelEvent): void {
    const el = this.chipsContainerRef?.nativeElement;
    if (el && (event.deltaY !== 0 || event.deltaX !== 0)) {
      event.preventDefault();
      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      el.scrollLeft += delta * 0.9;
    }
  }

  onPacksWheel(event: WheelEvent): void {
    const el = this.packsContainerRef?.nativeElement;
    if (el && (event.deltaY !== 0 || event.deltaX !== 0)) {
      event.preventDefault();
      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      el.scrollLeft += delta * 0.9;
    }
  }

  scrollChips(direction: 'left' | 'right'): void {
    const el = this.chipsContainerRef?.nativeElement;
    if (el) {
      const scrollAmount = direction === 'left' ? -160 : 160;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  ngOnInit(): void {
    // 1. Tải danh sách gói thịnh hành
    this.loadTrendingPackages();

    // 2. Setup pipeline tìm kiếm reactive với debounce 300ms
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          this.loading.set(true);
          this.errorMessage.set(null);

          if (!query.trim()) {
            // Nếu có package được chọn, load package đó; ngược lại search mặc định
            if (this.activePackageId()) {
              return this.stipopApi.getPackageDetail(this.activePackageId()!);
            }
            return this.stipopApi.searchStickers('', 1, 30);
          }
          return this.stipopApi.searchStickers(query, 1, 30);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result: any) => {
          this.loading.set(false);
          if (Array.isArray(result)) {
            this.stickers.set(result);
          } else if (result && Array.isArray(result.stickers)) {
            this.stickers.set(result.stickers);
          } else {
            this.stickers.set([]);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set('Không thể tải nhãn dán. Vui lòng thử lại sau.');
          console.error('[StipopPicker] Lỗi tải stickers:', err);
        },
      });

    // Kích hoạt tìm kiếm ban đầu
    this.onSearchChange('');

    setTimeout(() => {
      this.searchInputRef?.nativeElement.focus();
    }, 150);
  }

  private loadTrendingPackages(): void {
    this.stipopApi
      .getTrending(1, 20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pkgs) => {
          this.packages.set(pkgs);
        },
        error: (err) => {
          console.warn('[StipopPicker] Lỗi tải danh sách gói thịnh hành:', err);
        },
      });
  }

  selectPackage(pkg: StipopPackageSummary): void {
    this.activePackageId.set(pkg.packageId);
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.loading.set(true);
    this.errorMessage.set(null);

    this.stipopApi
      .getPackageDetail(pkg.packageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.loading.set(false);
          this.stickers.set(detail.stickers || []);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set('Không thể tải gói nhãn dán.');
          console.error('[StipopPicker] Lỗi tải gói:', err);
        },
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject$.next(query);
  }

  onSelectSticker(sticker: ExternalMediaDto): void {
    this.stickerSelected.emit(sticker);
  }

  onStickerImageError(event: Event, sticker: ExternalMediaDto): void {
    const image = event.currentTarget as HTMLImageElement;
    if (
      image.dataset['fallbackTried'] !== 'true' &&
      sticker.displayUrl &&
      image.src !== sticker.displayUrl
    ) {
      image.dataset['fallbackTried'] = 'true';
      image.src = sticker.displayUrl;
      return;
    }

    this.failedStickerIds.update((current) => {
      const next = new Set(current);
      next.add(sticker.externalId);
      return next;
    });
  }

  onPackageImageError(packageId: number): void {
    this.failedPackageIds.update((current) => {
      const next = new Set(current);
      next.add(packageId);
      return next;
    });
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    this.closePicker.emit();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.closePicker.emit();
    }
  }
}
