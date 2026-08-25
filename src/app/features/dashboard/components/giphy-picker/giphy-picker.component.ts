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
import { GiphyApiService } from '../../../../core/api/giphy-api.service';
import { GiphyMediaDto } from '../../../../../shared/dto/messages.dto';

@Component({
  selector: 'app-giphy-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './giphy-picker.component.html',
  styleUrl: './giphy-picker.component.scss',
})
export class GiphyPickerComponent implements OnInit {
  private readonly giphyApi = inject(GiphyApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);

  @Output() readonly gifSelected = new EventEmitter<GiphyMediaDto>();
  @Output() readonly closePicker = new EventEmitter<void>();

  @ViewChild('searchInput') private readonly searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('chipsContainer') private readonly chipsContainerRef?: ElementRef<HTMLDivElement>;

  readonly searchQuery = signal('');
  readonly gifs = signal<GiphyMediaDto[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hasConfiguredKey = signal(false);

  readonly quickCategories = [
    { label: '🔥 Thịnh hành', query: '' },
    { label: '😂 Hài hước', query: 'funny' },
    { label: '🎉 Ăn mừng', query: 'celebrate' },
    { label: '❤️ Thả tim', query: 'love' },
    { label: '🐱 Mèo', query: 'cute cat' },
    { label: '🐶 Chó', query: 'dog' },
    { label: '🎮 Gaming', query: 'gaming' },
    { label: '✨ Anime', query: 'anime' },
    { label: '😭 Khóc', query: 'crying' },
    { label: '👏 Vỗ tay', query: 'clapping' },
  ];
  readonly selectedCategory = signal<string>('');

  private readonly searchSubject$ = new Subject<string>();

  selectCategory(cat: { label: string; query: string }): void {
    this.selectedCategory.set(cat.query);
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

  scrollChips(direction: 'left' | 'right'): void {
    const el = this.chipsContainerRef?.nativeElement;
    if (el) {
      const scrollAmount = direction === 'left' ? -160 : 160;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  ngOnInit(): void {
    const hasKey = this.giphyApi.hasApiKey();
    this.hasConfiguredKey.set(hasKey);

    if (!hasKey) {
      this.errorMessage.set(
        'Chưa cấu hình GIPHY API key. Vui lòng thiết lập giphyApiKey trong môi trường.',
      );
      return;
    }

    // Thiết lập pipeline tìm kiếm phản hồi nhanh với debounce 300ms
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          this.loading.set(true);
          this.errorMessage.set(null);
          if (!query.trim()) {
            return this.giphyApi.getTrending(24, 0);
          }
          return this.giphyApi.searchGifs(query, 24, 0);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.gifs.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set('Không thể tải dữ liệu từ GIPHY. Vui lòng thử lại sau.');
        },
      });

    // Tải Trending ban đầu
    this.loadInitialTrending();

    // Auto-focus ô tìm kiếm
    setTimeout(() => {
      this.searchInputRef?.nativeElement?.focus();
    }, 100);
  }

  private loadInitialTrending(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.giphyApi
      .getTrending(24, 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.gifs.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Không thể tải danh sách GIF nổi bật.');
        },
      });
  }

  onSearchChange(text: string): void {
    this.searchQuery.set(text);
    this.searchSubject$.next(text);
  }

  onSelectGif(gif: GiphyMediaDto): void {
    this.gifSelected.emit(gif);
    this.closePicker.emit();
  }

  onKeyDownGif(event: KeyboardEvent, gif: GiphyMediaDto): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onSelectGif(gif);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    this.closePicker.emit();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      // Bấm ra ngoài picker -> Đóng
      this.closePicker.emit();
    }
  }
}
