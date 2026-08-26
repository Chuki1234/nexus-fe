import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExternalMediaDto } from '../../../shared/dto/messages.dto';

export interface StipopPackageSummary {
  packageId: number;
  packageName: string;
  packageImg: string;
  artistName: string;
  isAnimated: boolean;
}

export interface StipopPackageDetail extends StipopPackageSummary {
  stickers: ExternalMediaDto[];
}

@Injectable({
  providedIn: 'root',
})
export class StipopApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, any>();

  /**
   * Kiểm tra khả năng gọi API
   */
  hasApiKey(): boolean {
    return Boolean(environment.apiUrl);
  }

  /**
   * Lấy danh sách gói sticker thịnh hành (Trending Packs)
   */
  getTrending(pageNumber = 1, limit = 20): Observable<StipopPackageSummary[]> {
    const cacheKey = `trending_pkgs_${pageNumber}_${limit}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('limit', limit.toString());

    return this.http
      .get<StipopPackageSummary[]>(`${environment.apiUrl}/stipop/trending`, {
        params,
      })
      .pipe(
        map((res) => {
          this.cache.set(cacheKey, res);
          return res;
        }),
      );
  }

  /**
   * Tìm kiếm sticker theo từ khoá
   */
  searchStickers(
    query: string,
    pageNumber = 1,
    limit = 30,
  ): Observable<ExternalMediaDto[]> {
    const trimmed = query.trim();
    const cacheKey = `search_${trimmed.toLowerCase()}_${pageNumber}_${limit}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const params = new HttpParams()
      .set('q', trimmed)
      .set('pageNumber', pageNumber.toString())
      .set('limit', limit.toString());

    return this.http
      .get<ExternalMediaDto[]>(`${environment.apiUrl}/stipop/search`, {
        params,
      })
      .pipe(
        map((res) => {
          this.cache.set(cacheKey, res);
          return res;
        }),
      );
  }

  /**
   * Lấy chi tiết gói sticker và toàn bộ sticker trong gói
   */
  getPackageDetail(packageId: number | string): Observable<StipopPackageDetail> {
    const cacheKey = `package_${packageId}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    return this.http
      .get<StipopPackageDetail>(`${environment.apiUrl}/stipop/package/${packageId}`)
      .pipe(
        map((res) => {
          this.cache.set(cacheKey, res);
          return res;
        }),
      );
  }

  /**
   * Lấy danh sách từ khoá gợi ý
   */
  getSuggestions(): Observable<string[]> {
    const cacheKey = 'suggest_keywords';
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    return this.http
      .get<string[]>(`${environment.apiUrl}/stipop/suggest`)
      .pipe(
        map((res) => {
          this.cache.set(cacheKey, res);
          return res;
        }),
      );
  }
}
