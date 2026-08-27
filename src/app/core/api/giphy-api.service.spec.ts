import '@angular/compiler';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { GiphyMediaDto } from '../../../shared/dto/messages.dto';
import { GiphyApiService } from './giphy-api.service';

describe('GiphyApiService', () => {
  let service: GiphyApiService;
  let httpMock: HttpTestingController;

  const mockTrendingDtos: GiphyMediaDto[] = [
    {
      provider: 'giphy',
      externalId: 'testGif123',
      mediaType: 'gif',
      title: 'Happy Dance GIF by Cat',
      creatorUsername: 'catvibes',
      pageUrl: 'https://giphy.com/gifs/cat-testGif123',
      previewUrl: 'https://media0.giphy.com/media/testGif123/200w.webp',
      displayUrl: 'https://media0.giphy.com/media/testGif123/giphy.gif',
      mp4Url: 'https://media1.giphy.com/media/testGif123/200w.mp4',
      width: 480,
      height: 360,
    },
  ];

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
  });

  it('isConfigured() trả về true khi backend apiUrl được định nghĩa', () => {
    expect(service.isConfigured()).toBe(true);
  });

  it('getTrending() gửi đúng params tới endpoint backend proxy', async () => {
    const promise = firstValueFrom(service.getTrending(20, 0));

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/giphy/trending` &&
        r.params.get('limit') === '20' &&
        r.params.get('offset') === '0',
    );
    expect(req.request.method).toBe('GET');

    req.flush(mockTrendingDtos);
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

  it('searchGifs() gửi đúng từ khóa tìm kiếm và query params tới backend proxy', async () => {
    const promise = firstValueFrom(service.searchGifs('mèo cute', 15, 0));

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/giphy/search` &&
        r.params.get('q') === 'mèo cute' &&
        r.params.get('limit') === '15' &&
        r.params.get('offset') === '0',
    );
    expect(req.request.method).toBe('GET');

    req.flush(mockTrendingDtos);
    const dtos = await promise;

    expect(dtos).toHaveLength(1);
    expect(dtos[0].externalId).toBe('testGif123');
  });

  it('sử dụng session cache khi gọi lại cùng query mà không phát HTTP request mới', async () => {
    const promise1 = firstValueFrom(service.searchGifs('dog', 24, 0));
    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/giphy/search`);
    req.flush(mockTrendingDtos);
    const firstResult = await promise1;
    expect(firstResult).toHaveLength(1);

    // Gọi lần 2 với cùng tham số
    const secondResult = await firstValueFrom(service.searchGifs('dog', 24, 0));
    expect(secondResult).toBe(firstResult);

    // Không có request thứ 2 nào được gửi đi
    httpMock.verify();
  });
});
