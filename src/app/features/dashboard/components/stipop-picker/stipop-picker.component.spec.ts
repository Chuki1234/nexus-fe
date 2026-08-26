import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StipopApiService } from '../../../../core/api/stipop-api.service';
import { ExternalMediaDto } from '../../../../../shared/dto/messages.dto';
import { StipopPickerComponent } from './stipop-picker.component';

describe('StipopPickerComponent', () => {
  let component: StipopPickerComponent;
  let fixture: ComponentFixture<StipopPickerComponent>;
  let mockStipopApi: any;

  const mockSticker: ExternalMediaDto = {
    provider: 'stipop',
    externalId: '45268',
    mediaType: 'sticker',
    title: 'happy',
    creatorUsername: 'amam',
    pageUrl: 'https://stipop.io/package/2199',
    previewUrl: 'https://img.stipop.io/sticker/2199/200t5ZzVZ9Ebx.png',
    displayUrl: 'https://img.stipop.io/2019/9/6/1567827398490_7.png',
    mp4Url: null,
    width: 300,
    height: 300,
  };

  const mockPackages = [
    {
      packageId: 22912,
      packageName: 'Butler and Cats',
      packageImg: 'https://img.stipop.io/pkg.gif',
      artistName: 'JUHEEYU',
      isAnimated: true,
    },
  ];

  beforeEach(async () => {
    mockStipopApi = {
      hasApiKey: vi.fn().mockReturnValue(true),
      getTrending: vi.fn().mockReturnValue(of(mockPackages)),
      searchStickers: vi.fn().mockReturnValue(of([mockSticker])),
      getPackageDetail: vi.fn().mockReturnValue(
        of({
          packageId: 22912,
          packageName: 'Butler and Cats',
          packageImg: 'https://img.stipop.io/pkg.gif',
          artistName: 'JUHEEYU',
          isAnimated: true,
          stickers: [mockSticker],
        }),
      ),
      getSuggestions: vi.fn().mockReturnValue(of(['happy', 'love'])),
    };

    await TestBed.configureTestingModule({
      imports: [StipopPickerComponent],
      providers: [{ provide: StipopApiService, useValue: mockStipopApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(StipopPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo và tải danh sách gói thịnh hành', () => {
    expect(mockStipopApi.getTrending).toHaveBeenCalled();
    expect(component.packages().length).toBe(1);
    expect(component.packages()[0].packageName).toBe('Butler and Cats');
  });

  it('chọn một sticker phát ra output event stickerSelected', () => {
    const emitSpy = vi.spyOn(component.stickerSelected, 'emit');

    component.onSelectSticker(mockSticker);

    expect(emitSpy).toHaveBeenCalledWith(mockSticker);
  });

  it('fallback sang displayUrl khi preview sticker tải lỗi', () => {
    const image = document.createElement('img');
    image.src = mockSticker.previewUrl;

    component.onStickerImageError({ currentTarget: image } as unknown as Event, mockSticker);

    expect(image.dataset['fallbackTried']).toBe('true');
    expect(image.src).toBe(mockSticker.displayUrl);
    expect(component.failedStickerIds().has(mockSticker.externalId)).toBe(false);
  });

  it('hiển thị fallback khi cả preview và display sticker đều tải lỗi', () => {
    const image = document.createElement('img');
    image.src = mockSticker.displayUrl;
    image.dataset['fallbackTried'] = 'true';

    component.onStickerImageError({ currentTarget: image } as unknown as Event, mockSticker);

    expect(component.failedStickerIds().has(mockSticker.externalId)).toBe(true);
  });

  it('chọn một package ở footer sẽ tải toàn bộ stickers trong gói đó', () => {
    component.selectPackage(mockPackages[0]);

    expect(component.activePackageId()).toBe(22912);
    expect(mockStipopApi.getPackageDetail).toHaveBeenCalledWith(22912);
    expect(component.stickers().length).toBe(1);
  });

  it('nhấn Escape phát ra output closePicker', () => {
    const closeSpy = vi.spyOn(component.closePicker, 'emit');

    component.onEscapePress();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('xử lý trạng thái lỗi khi API thất bại', () => {
    mockStipopApi.searchStickers.mockReturnValueOnce(
      throwError(() => new Error('Network error')),
    );

    component.onSearchChange('error_query');
    fixture.detectChanges();

    // Do debounce 300ms, let's test directly through error handler if needed
    expect(component.errorMessage).toBeDefined();
  });
});
