import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { StipopApiService } from './stipop-api.service';

describe('StipopApiService', () => {
  let service: StipopApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StipopApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(StipopApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getTrending gọi GET /api/stipop/trending với đúng query params', () => {
    const mockPackages = [
      {
        packageId: 22912,
        packageName: 'Butler and Cats',
        packageImg: 'https://img.stipop.io/pkg.gif',
        artistName: 'JUHEEYU',
        isAnimated: true,
      },
    ];

    service.getTrending(1, 20).subscribe((res) => {
      expect(res).toEqual(mockPackages);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/stipop/trending` && r.params.get('pageNumber') === '1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPackages);
  });

  it('searchStickers gọi GET /api/stipop/search với đúng query params', () => {
    const mockStickers = [
      {
        provider: 'stipop' as const,
        externalId: '45268',
        mediaType: 'sticker' as const,
        title: 'happy',
        creatorUsername: 'amam',
        pageUrl: 'https://stipop.io/package/2199',
        previewUrl: 'https://img.stipop.io/prev.png',
        displayUrl: 'https://img.stipop.io/disp.png',
        mp4Url: null,
        width: 300,
        height: 300,
      },
    ];

    service.searchStickers('happy', 1, 30).subscribe((res) => {
      expect(res).toEqual(mockStickers);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/stipop/search` && r.params.get('q') === 'happy',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockStickers);
  });

  it('getPackageDetail gọi GET /api/stipop/package/:id', () => {
    const mockDetail = {
      packageId: 22912,
      packageName: 'Butler and Cats',
      packageImg: 'https://img.stipop.io/pkg.gif',
      artistName: 'JUHEEYU',
      isAnimated: true,
      stickers: [],
    };

    service.getPackageDetail('22912').subscribe((res) => {
      expect(res).toEqual(mockDetail);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/stipop/package/22912`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDetail);
  });
});
