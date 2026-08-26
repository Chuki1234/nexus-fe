import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GiphyApiService, GiphySearchResponse } from './giphy-api.service';

describe('GiphyApiService', () => {
  let service: GiphyApiService;
  let httpMock: HttpTestingController;

  const mockTrendingResponse: GiphySearchResponse = {
    data: [
      {
        id: 'testGif123',
        title: 'Happy Dance GIF by Cat',
        url: 'https://giphy.com/gifs/cat-testGif123',
        username: 'catvibes',
        images: {
          original: {
            url: 'https://media0.giphy.com/media/testGif123/giphy.gif',
            width: '480',
            height: '360',
            mp4: 'https://media1.giphy.com/media/testGif123/giphy.mp4',
            webp: 'https://media0.giphy.com/media/testGif123/giphy.webp',
          },
          fixed_width: {
            url: 'https://media0.giphy.com/media/testGif123/200w.gif',
            width: '200',
            height: '150',
            mp4: 'https://media1.giphy.com/media/testGif123/200w.mp4',
            webp: 'https://media0.giphy.com/media/testGif123/200w.webp',
          },
        },
      },
    ],
    pagination: { total_count: 1, count: 1, offset: 0 },
    meta: { status: 200, msg: 'OK' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GiphyApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(GiphyApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    environment.giphyApiKey = '';
  });

  it('hasApiKey() trả về false khi apiKey rỗng hoặc là placeholder', () => {
    environment.giphyApiKey = '';
    expect(service.hasApiKey()).toBe(false);

    environment.giphyApiKey = '   ';
    expect(service.hasApiKey()).toBe(false);

    environment.giphyApiKey = 'GIPHY_API_KEY_PLACEHOLDER';
    expect(service.hasApiKey()).toBe(false);

    environment.giphyApiKey = 'valid_test_key';
    expect(service.hasApiKey()).toBe(true);
  });

  it('getTrending() không phát HTTP request và trả về lỗi nếu chưa cấu hình API key', async () => {
    environment.giphyApiKey = '';
    await expect(firstValueFrom(service.getTrending())).rejects.toThrow('GIPHY_API_KEY_NOT_CONFIGURED');
    httpMock.expectNone('https://api.giphy.com/v1/gifs/trending');
  });

  it('getTrending() gửi đúng params và parse dữ liệu chuẩn khi có API key', async () => {
    environment.giphyApiKey = 'test_api_key_123';

    const promise = firstValueFrom(service.getTrending(20, 0));

    const req = httpMock.expectOne((r) => r.url === 'https://api.giphy.com/v1/gifs/trending');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('api_key')).toBe('test_api_key_123');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.get('rating')).toBe('g');

    req.flush(mockTrendingResponse);
    const dtos = await promise;

    expect(dtos).toHaveLength(1);
    const gif = dtos[0];
    expect(gif.externalId).toBe('testGif123');
    expect(gif.provider).toBe('giphy');
    expect(gif.mediaType).toBe('gif');
    expect(gif.title).toBe('Happy Dance GIF by Cat');
    expect(gif.creatorUsername).toBe('catvibes');
    expect(gif.width).toBe(480);
    expect(gif.height).toBe(360);
    expect(gif.mp4Url).toBe('https://media1.giphy.com/media/testGif123/200w.mp4');
    expect(gif.previewUrl).toBe('https://media0.giphy.com/media/testGif123/200w.webp');
    expect(gif.displayUrl).toBe('https://media0.giphy.com/media/testGif123/giphy.gif');
  });

  it('searchGifs() gửi đúng từ khóa tìm kiếm và query params', async () => {
    environment.giphyApiKey = 'test_api_key_123';

    const promise = firstValueFrom(service.searchGifs('mèo cute', 15, 0));

    const req = httpMock.expectOne((r) => r.url === 'https://api.giphy.com/v1/gifs/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('mèo cute');
    expect(req.request.params.get('lang')).toBe('vi');
    expect(req.request.params.get('limit')).toBe('15');

    req.flush(mockTrendingResponse);
    const dtos = await promise;

    expect(dtos).toHaveLength(1);
    expect(dtos[0].externalId).toBe('testGif123');
  });

  it('sử dụng session cache khi gọi lại cùng query mà không phát HTTP request mới', async () => {
    environment.giphyApiKey = 'test_api_key_123';

    const promise1 = firstValueFrom(service.searchGifs('dog', 24, 0));
    const req = httpMock.expectOne((r) => r.url === 'https://api.giphy.com/v1/gifs/search');
    req.flush(mockTrendingResponse);
    const firstResult = await promise1;
    expect(firstResult).toHaveLength(1);

    // Gọi lần 2 với cùng tham số
    const secondResult = await firstValueFrom(service.searchGifs('dog', 24, 0));
    expect(secondResult).toBe(firstResult);

    // Không có request thứ 2 nào được gửi đi
    httpMock.verify();
  });

  it('xử lý an toàn khi API trả về metadata rỗng hoặc kích thước không hợp lệ', async () => {
    environment.giphyApiKey = 'test_api_key_123';

    const malformedResponse: GiphySearchResponse = {
      data: [
        {
          id: 'malformed1',
          title: '',
          images: {
            original: {
              url: 'https://media.giphy.com/media/m1/giphy.gif',
              width: 'invalid_number',
              height: 'NaN',
            },
          },
        },
        {
          id: 'missingUrls',
          images: {},
        },
      ],
    };

    const promise = firstValueFrom(service.getTrending());
    const req = httpMock.expectOne((r) => r.url === 'https://api.giphy.com/v1/gifs/trending');
    req.flush(malformedResponse);

    const dtos = await promise;
    // Chỉ item có displayUrl và previewUrl mới được giữ lại
    expect(dtos).toHaveLength(1);
    expect(dtos[0].externalId).toBe('malformed1');
    expect(dtos[0].title).toBe('GIF');
    expect(dtos[0].width).toBe(480); // Default fallback
    expect(dtos[0].height).toBe(360);
  });
});
