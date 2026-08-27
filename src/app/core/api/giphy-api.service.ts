import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GiphyMediaDto } from '../../../shared/dto/messages.dto';

@Injectable({
  providedIn: 'root',
})
export class GiphyApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, GiphyMediaDto[]>();

  /**
   * Kiểm tra khả năng gọi GIPHY API (thông qua Backend Proxy).
   */
  isConfigured(): boolean {
    return Boolean(environment.apiUrl);
  }

  /**
   * Lấy danh sách GIF Trending thông qua Backend Proxy.
   */
  getTrending(limit = 24, offset = 0): Observable<GiphyMediaDto[]> {
    const cacheKey = `trending_${limit}_${offset}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http
      .get<GiphyMediaDto[]>(`${environment.apiUrl}/giphy/trending`, {
        params,
      })
      .pipe(
        map((dtos) => {
          this.cache.set(cacheKey, dtos);
          return dtos;
        }),
      );
  }

  /**
   * Tìm kiếm GIF theo từ khóa thông qua Backend Proxy.
   */
  searchGifs(
    query: string,
    limit = 24,
    offset = 0,
  ): Observable<GiphyMediaDto[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getTrending(limit, offset);
    }

    const cacheKey = `search_${trimmed.toLowerCase()}_${limit}_${offset}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const params = new HttpParams()
      .set('q', trimmed)
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http
      .get<GiphyMediaDto[]>(`${environment.apiUrl}/giphy/search`, {
        params,
      })
      .pipe(
        map((dtos) => {
          this.cache.set(cacheKey, dtos);
          return dtos;
        }),
      );
  }
}
