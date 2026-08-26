import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { GiphyApiService } from '../../../../core/api/giphy-api.service';
import { GiphyMediaDto } from '../../../../../shared/dto/messages.dto';
import { GiphyPickerComponent } from './giphy-picker.component';

describe('GiphyPickerComponent', () => {
  let component: GiphyPickerComponent;
  let fixture: ComponentFixture<GiphyPickerComponent>;
  let mockGiphyApi: {
    hasApiKey: ReturnType<typeof vi.fn>;
    getTrending: ReturnType<typeof vi.fn>;
    searchGifs: ReturnType<typeof vi.fn>;
  };

  const sampleGif: GiphyMediaDto = {
    provider: 'giphy',
    externalId: 'test1234',
    mediaType: 'gif',
    title: 'Happy Dancing Cat',
    creatorUsername: 'catvibes',
    pageUrl: 'https://giphy.com/gifs/cat-test1234',
    previewUrl: 'https://media0.giphy.com/media/test1234/200w.webp',
    displayUrl: 'https://media0.giphy.com/media/test1234/giphy.gif',
    mp4Url: 'https://media1.giphy.com/media/test1234/200w.mp4',
    width: 400,
    height: 300,
  };

  beforeEach(async () => {
    mockGiphyApi = {
      hasApiKey: vi.fn(),
      getTrending: vi.fn(),
      searchGifs: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GiphyPickerComponent],
      providers: [{ provide: GiphyApiService, useValue: mockGiphyApi }],
    }).compileComponents();
  });

  it('hiển thị thông báo yêu cầu cấu hình key nếu hasApiKey() = false', () => {
    mockGiphyApi.hasApiKey.mockReturnValue(false);

    fixture = TestBed.createComponent(GiphyPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasConfiguredKey()).toBe(false);
    expect(component.errorMessage()).toContain('Chưa cấu hình GIPHY API key');
    expect(mockGiphyApi.getTrending).not.toHaveBeenCalled();
  });

  it('tự động tải danh sách Trending khi đã cấu hình key', () => {
    mockGiphyApi.hasApiKey.mockReturnValue(true);
    mockGiphyApi.getTrending.mockReturnValue(of([sampleGif]));

    fixture = TestBed.createComponent(GiphyPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(mockGiphyApi.getTrending).toHaveBeenCalled();
    expect(component.gifs()).toEqual([sampleGif]);
    expect(component.loading()).toBe(false);
  });

  it('gọi searchGifs khi người dùng gõ từ khóa sau thời gian debounce 300ms', () => {
    vi.useFakeTimers();
    try {
      mockGiphyApi.hasApiKey.mockReturnValue(true);
      mockGiphyApi.getTrending.mockReturnValue(of([]));
      mockGiphyApi.searchGifs.mockReturnValue(of([sampleGif]));

      fixture = TestBed.createComponent(GiphyPickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component.onSearchChange('mèo');
      expect(mockGiphyApi.searchGifs).not.toHaveBeenCalled();

      vi.advanceTimersByTime(350);
      expect(mockGiphyApi.searchGifs).toHaveBeenCalledWith('mèo', 24, 0);
      expect(component.gifs()).toEqual([sampleGif]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('emit gifSelected và closePicker khi chọn một GIF', () => {
    mockGiphyApi.hasApiKey.mockReturnValue(true);
    mockGiphyApi.getTrending.mockReturnValue(of([sampleGif]));

    fixture = TestBed.createComponent(GiphyPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const gifSpy = vi.spyOn(component.gifSelected, 'emit');
    const closeSpy = vi.spyOn(component.closePicker, 'emit');

    component.onSelectGif(sampleGif);

    expect(gifSpy).toHaveBeenCalledWith(sampleGif);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('emit closePicker khi nhấn phím Escape', () => {
    mockGiphyApi.hasApiKey.mockReturnValue(true);
    mockGiphyApi.getTrending.mockReturnValue(of([]));

    fixture = TestBed.createComponent(GiphyPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.closePicker, 'emit');
    component.onEscapePress();

    expect(closeSpy).toHaveBeenCalled();
  });
});
