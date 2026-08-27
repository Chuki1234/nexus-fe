import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServersApiService, formatApiError } from '../api/servers-api.service';
import { ServersStore } from './servers.store';

/**
 * Tuần tự hóa các lần lưu layout theo server để thao tác kéo liên tiếp không bị
 * response cũ ghi đè response mới. Backend vẫn là nguồn canonical duy nhất.
 */
@Injectable({ providedIn: 'root' })
export class ServerChannelStructureSyncService {
  private readonly api = inject(ServersApiService);
  private readonly store = inject(ServersStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly queues = new Map<string, Promise<void>>();

  save(serverId: string): Promise<void> {
    const snapshot = this.store.channelStructureOf(serverId);
    const previous = this.queues.get(serverId) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const saved = await this.api.updateChannelStructure(serverId, snapshot);
        this.store.applyServerChannelStructure(serverId, saved);
      })
      .catch(async (error) => {
        try {
          const canonical = await this.api.getChannelStructure(serverId);
          this.store.applyServerChannelStructure(serverId, canonical);
        } catch {
          // Giữ UI hiện tại nếu cả thao tác reload canonical cũng thất bại.
        }

        this.snackBar.open(formatApiError(error), 'Đóng', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
        });
        throw error;
      })
      .finally(() => {
        if (this.queues.get(serverId) === next) {
          this.queues.delete(serverId);
        }
      });

    this.queues.set(serverId, next);
    return next;
  }
}
