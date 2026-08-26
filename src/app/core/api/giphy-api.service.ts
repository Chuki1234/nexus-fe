import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GiphyMediaDto } from '../../../shared/dto/messages.dto';

export interface GiphySearchResponse {
  data: Array<{
    id: string;
    title?: string;
    url?: string;
    username?: string;
    user?: {
      username?: string;
      display_name?: string;
    };
    images?: {
      original?: {
        url?: string;
        width?: string;
        height?: string;
        webp?: string;
        mp4?: string;
      };
      fixed_width?: {
        url?: string;
        width?: string;
        height?: string;
        webp?: string;
        mp4?: string;
      };
      downsized_medium?: {
        url?: string;
        width?: string;
        height?: string;
      };
    };
  }>;
  pagination?: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta?: {
    status: number;
    msg: string;
    response_id?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GiphyApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, GiphyMediaDto[]>();

  /**
   * Kiểm tra xem GIPHY API key đã được cấu hình hợp lệ hay chưa.
   */
  hasApiKey(): boolean {
    const key = environment.giphyApiKey?.trim();
    return Boolean(key && key !== 'GIPHY_API_KEY_PLACEHOLDER');
  }

  /**
   * Lấy danh sách GIF Trending từ GIPHY.
   */
  getTrending(limit = 24, offset = 0): Observable<GiphyMediaDto[]> {
    const cacheKey = `trending_${limit}_${offset}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    if (!this.hasApiKey()) {
      return throwError(() => new Error('GIPHY_API_KEY_NOT_CONFIGURED'));
    }

    const params = new HttpParams()
      .set('api_key', environment.giphyApiKey.trim())
      .set('limit', limit.toString())
      .set('offset', offset.toString())
      .set('rating', 'g');

    return this.http
      .get<GiphySearchResponse>('https://api.giphy.com/v1/gifs/trending', {
        params,
      })
      .pipe(
        map((res) => {
          const dtos = this.mapGiphyResponseToDtos(res);
          this.cache.set(cacheKey, dtos);
          return dtos;
        }),
        catchError((err) => {
          return throwError(() => err);
        }),
      );
  }

  /**
   * Tìm kiếm GIF theo từ khóa trên GIPHY.
   */
  searchGifs(query: string, limit = 24, offset = 0): Observable<GiphyMediaDto[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getTrending(limit, offset);
    }

    const cacheKey = `search_${trimmed.toLowerCase()}_${limit}_${offset}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    if (!this.hasApiKey()) {
      return throwError(() => new Error('GIPHY_API_KEY_NOT_CONFIGURED'));
    }

    const params = new HttpParams()
      .set('api_key', environment.giphyApiKey.trim())
      .set('q', trimmed)
      .set('limit', limit.toString())
      .set('offset', offset.toString())
      .set('rating', 'g')
      .set('lang', 'vi');

    return this.http
      .get<GiphySearchResponse>('https://api.giphy.com/v1/gifs/search', {
        params,
      })
      .pipe(
        map((res) => {
          const dtos = this.mapGiphyResponseToDtos(res);
          this.cache.set(cacheKey, dtos);
          return dtos;
        }),
        catchError((err) => {
          return throwError(() => err);
        }),
      );
  }

  /**
   * Chuyển đổi payload thô từ GIPHY API sang mảng canonical GiphyMediaDto.
   * Xử lý fallback thứ tự rendition và parse an toàn kích thước chuỗi.
   */
  private mapGiphyResponseToDtos(res: GiphySearchResponse): GiphyMediaDto[] {
    if (!res || !Array.isArray(res.data)) {
      return [];
    }

    const results: GiphyMediaDto[] = [];
    for (const item of res.data) {
      if (!item || !item.id) continue;

      const original = item.images?.original;
      const fixedWidth = item.images?.fixed_width;
      const downsized = item.images?.downsized_medium;

      // 1. Trích xuất URLs với fallback
      const displayUrl =
        original?.url || downsized?.url || fixedWidth?.url || null;
      const previewUrl =
        fixedWidth?.webp ||
        fixedWidth?.url ||
        original?.webp ||
        original?.url ||
        displayUrl;
      const mp4Url = fixedWidth?.mp4 || original?.mp4 || null;
      const pageUrl = item.url || `https://giphy.com/gifs/${item.id}`;

      if (!displayUrl || !previewUrl) {
        continue;
      }

      // 2. Parse kích thước an toàn từ chuỗi (GIPHY trả về width/height string)
      let width = 480;
      let height = 360;

      if (original?.width && original?.height) {
        const parsedW = parseInt(original.width, 10);
        const parsedH = parseInt(original.height, 10);
        if (!isNaN(parsedW) && !isNaN(parsedH) && parsedW > 0 && parsedH > 0) {
          width = Math.min(parsedW, 4096);
          height = Math.min(parsedH, 4096);
        }
      } else if (fixedWidth?.width && fixedWidth?.height) {
        const parsedW = parseInt(fixedWidth.width, 10);
        const parsedH = parseInt(fixedWidth.height, 10);
        if (!isNaN(parsedW) && !isNaN(parsedH) && parsedW > 0 && parsedH > 0) {
          width = Math.min(parsedW, 4096);
          height = Math.min(parsedH, 4096);
        }
      }

      const dto: GiphyMediaDto = {
        provider: 'giphy',
        externalId: item.id,
        mediaType: 'gif',
        title: (item.title?.trim() || 'GIF').slice(0, 255),
        creatorUsername: (item.username || item.user?.username || null)?.slice(0, 100) || null,
        pageUrl,
        previewUrl,
        displayUrl,
        mp4Url,
        width,
        height,
      };

      results.push(dto);
    }

    return results;
  }
}
