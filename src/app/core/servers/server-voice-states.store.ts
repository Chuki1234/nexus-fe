import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatSocketService } from '../realtime/chat-socket.service';
import type {
  VoiceMemberState,
  VoiceServerStatesSyncPayload,
  VoiceStateUpdatePayload,
} from '../../../shared/socket-events';

@Injectable({ providedIn: 'root' })
export class ServerVoiceStatesStore {
  private readonly chatSocket = inject(ChatSocketService);
  private readonly destroyRef = inject(DestroyRef);

  /** Map lưu danh sách VoiceMemberState theo serverId: Record<serverId, VoiceMemberState[]> */
  readonly voiceStatesByServer = signal<Record<string, VoiceMemberState[]>>({});

  constructor() {
    this.chatSocket.voiceServerStatesSync$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: VoiceServerStatesSyncPayload) => {
        this.handleServerStatesSync(payload);
      });

    this.chatSocket.voiceStateUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: VoiceStateUpdatePayload) => {
        this.handleVoiceStateUpdated(payload);
      });
  }

  /**
   * Lấy danh sách VoiceMemberState cho một server cụ thể
   */
  getServerVoiceStates(serverId: string): VoiceMemberState[] {
    return this.voiceStatesByServer()[serverId] || [];
  }

  /**
   * Lấy danh sách VoiceMemberState cho một kênh voice cụ thể trong server
   */
  getChannelVoiceMembers(serverId: string, channelId: string): VoiceMemberState[] {
    const list = this.voiceStatesByServer()[serverId] || [];
    return list.filter((m) => m.channelId === channelId);
  }

  /**
   * Đồng bộ tức thời danh sách user đang online trong kênh voice từ WebRTC/LiveKit
   */
  syncActiveChannelParticipants(serverId: string, channelId: string, activeUserIds: string[]): void {
    if (!serverId || !channelId) return;
    const activeSet = new Set(activeUserIds);
    this.voiceStatesByServer.update((prev) => {
      const currentList = prev[serverId] || [];
      const filtered = currentList.filter(
        (m) => m.channelId !== channelId || activeSet.has(m.userId),
      );
      if (filtered.length === currentList.length) {
        return prev;
      }
      return {
        ...prev,
        [serverId]: filtered,
      };
    });
  }

  /**
   * Xóa một thành viên khỏi voice state của server khi họ ngắt kết nối WebRTC
   */
  removeVoiceMember(serverId: string, userId: string): void {
    if (!serverId || !userId) return;
    this.voiceStatesByServer.update((prev) => {
      const currentList = prev[serverId] || [];
      return {
        ...prev,
        [serverId]: currentList.filter((m) => m.userId !== userId),
      };
    });
  }

  /**
   * Yêu cầu backend gửi snapshot voice states của server
   */
  async loadServerVoiceStates(serverId: string): Promise<void> {
    if (!serverId) return;
    try {
      const res = await this.chatSocket.getServerVoiceStates(serverId);
      if (res && res.states) {
        this.handleServerStatesSync(res);
      }
    } catch (err) {
      console.warn(`Lỗi nạp voice states cho server ${serverId}:`, err);
    }
  }

  private handleServerStatesSync(payload: VoiceServerStatesSyncPayload): void {
    if (!payload?.serverId) return;
    this.voiceStatesByServer.update((prev) => ({
      ...prev,
      [payload.serverId]: payload.states || [],
    }));
  }

  private handleVoiceStateUpdated(payload: VoiceStateUpdatePayload): void {
    if (!payload?.serverId) return;

    this.voiceStatesByServer.update((prev) => {
      const currentList = prev[payload.serverId] || [];
      if (!payload.state || !payload.channelId) {
        // User rời khỏi kênh voice
        const filtered = currentList.filter((m) => m.userId !== payload.userId);
        return {
          ...prev,
          [payload.serverId]: filtered,
        };
      }

      // User tham gia hoặc cập nhật trạng thái trong kênh voice
      const index = currentList.findIndex((m) => m.userId === payload.userId);
      let updatedList: VoiceMemberState[];
      if (index >= 0) {
        updatedList = [...currentList];
        updatedList[index] = payload.state;
      } else {
        updatedList = [...currentList, payload.state];
      }

      return {
        ...prev,
        [payload.serverId]: updatedList,
      };
    });
  }
}
