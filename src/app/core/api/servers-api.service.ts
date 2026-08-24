import { HttpErrorResponse, HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentServerCapabilities } from '../../../shared/dto/server-capabilities.dto';
import {
  CreateServerInviteLinkDto,
  DirectServerInvitationDto,
  ServerInviteCandidateDto,
  ServerInviteLinkResponseDto,
  ServerInvitePreviewDto,
} from '../../../shared/dto/server-invitations.dto';
import { ServerMemberDto } from '../../../shared/dto/server-members.dto';
export type { ServerMemberDto };
import { AuthService } from '../auth/auth.service';
import type { ChannelSummary, ServerSummary } from './shell-data';

export type ServerTemplateId =
  | 'custom'
  | 'gaming'
  | 'friends'
  | 'study'
  | 'school_club';

export interface ChannelTemplateSeed {
  name: string;
  type: 'text' | 'voice';
  position: number;
}

export interface ServerTemplate {
  id: ServerTemplateId;
  name: string;
  description: string;
  icon: string;
  textChannelCount: number;
  voiceChannelCount: number;
  channels: ChannelTemplateSeed[];
}

export const CANONICAL_SERVER_TEMPLATES: readonly ServerTemplate[] = [
  {
    id: 'custom',
    name: 'Tạo mẫu riêng',
    description: '1 kênh chữ',
    icon: 'tune',
    textChannelCount: 1,
    voiceChannelCount: 0,
    channels: [{ name: 'chung', type: 'text', position: 0 }],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    description: '3 kênh chữ · 2 kênh thoại',
    icon: 'sports_esports',
    textChannelCount: 3,
    voiceChannelCount: 2,
    channels: [
      { name: 'chào-mừng', type: 'text', position: 0 },
      { name: 'tìm-đồng-đội', type: 'text', position: 1 },
      { name: 'ảnh-và-clip', type: 'text', position: 2 },
      { name: 'Phòng chờ', type: 'voice', position: 3 },
      { name: 'Đội 1', type: 'voice', position: 4 },
    ],
  },
  {
    id: 'friends',
    name: 'Bạn bè',
    description: '3 kênh chữ · 1 kênh thoại',
    icon: 'favorite',
    textChannelCount: 3,
    voiceChannelCount: 1,
    channels: [
      { name: 'chung', type: 'text', position: 0 },
      { name: 'kèo-cuối-tuần', type: 'text', position: 1 },
      { name: 'ảnh-và-meme', type: 'text', position: 2 },
      { name: 'Phòng khách', type: 'voice', position: 3 },
    ],
  },
  {
    id: 'study',
    name: 'Nhóm học tập',
    description: '4 kênh chữ · 1 kênh thoại',
    icon: 'school',
    textChannelCount: 4,
    voiceChannelCount: 1,
    channels: [
      { name: 'thông-báo', type: 'text', position: 0 },
      { name: 'thảo-luận', type: 'text', position: 1 },
      { name: 'tài-liệu', type: 'text', position: 2 },
      { name: 'bài-tập', type: 'text', position: 3 },
      { name: 'Phòng học', type: 'voice', position: 4 },
    ],
  },
  {
    id: 'school_club',
    name: 'Câu lạc bộ trường học',
    description: '4 kênh chữ · 1 kênh thoại',
    icon: 'groups',
    textChannelCount: 4,
    voiceChannelCount: 1,
    channels: [
      { name: 'thông-báo', type: 'text', position: 0 },
      { name: 'giới-thiệu', type: 'text', position: 1 },
      { name: 'sự-kiện', type: 'text', position: 2 },
      { name: 'ban-tổ-chức', type: 'text', position: 3 },
      { name: 'Sinh hoạt chung', type: 'voice', position: 4 },
    ],
  },
] as const;

export interface CreateServerResult {
  server: ServerSummary;
  channels: ChannelSummary[];
}

export interface ServerWithChannels extends ServerSummary {
  channels: ChannelSummary[];
}

interface CreateServerPayload {
  name: string;
  templateId: string;
}

interface CreateChannelPayload {
  name: string;
  type: 'text' | 'voice';
  topic?: string;
}

/**
 * Chuẩn hóa thông báo lỗi từ HTTP request cho người dùng cuối:

 * - Status 0: Lỗi mạng hoặc bị chặn bởi CORS
 * - Status 401: Hết phiên đăng nhập
 * - Status 400: Lỗi dữ liệu không hợp lệ từ DTO backend
 * - Status 503/500: Lỗi cơ sở dữ liệu hoặc migration chưa áp dụng
 */
export function formatApiError(err: unknown): string {
  if (err instanceof HttpErrorResponse || (typeof err === 'object' && err !== null && 'status' in err)) {
    const httpErr = err as HttpErrorResponse;
    const status = httpErr.status;
    const backendMessage =
      httpErr.error && typeof httpErr.error === 'object' && 'message' in httpErr.error
        ? httpErr.error.message
        : typeof httpErr.error === 'string'
          ? httpErr.error
          : null;

    const formattedBackendMessage = Array.isArray(backendMessage)
      ? backendMessage.join(', ')
      : typeof backendMessage === 'string'
        ? backendMessage
        : null;

    if (status === 0) {
      return 'Không thể kết nối đến máy chủ backend (lỗi mạng hoặc bị chặn bởi CORS). Vui lòng kiểm tra backend.';
    }

    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
    }

    if (status === 400) {
      return formattedBackendMessage || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin nhập.';
    }

    if (status === 503 || status === 500) {
      return (
        formattedBackendMessage ||
        'Cơ sở dữ liệu chưa sẵn sàng hoặc gặp sự cố. Vui lòng kiểm tra migration Supabase.'
      );
    }

    if (formattedBackendMessage) {
      return formattedBackendMessage;
    }
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return 'Không thể hoàn tất thao tác máy chủ. Vui lòng thử lại sau.';
}

@Injectable({ providedIn: 'root' })
export class ServersApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /**
   * Lấy danh sách canonical template cho máy chủ từ backend.
   * Tuyệt đối không fallback âm thầm sang mock constant khi API hỏng.
   */
  async getTemplates(): Promise<ServerTemplate[]> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.get<ServerTemplate[]>(`${environment.apiUrl}/server-templates`, { headers }),
    );
  }

  /**
   * Tạo máy chủ mới theo mẫu qua POST /api/servers kèm token xác thực.
   */
  async createServer(name: string, templateId: ServerTemplateId = 'custom'): Promise<CreateServerResult> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.post<CreateServerResult>(
        `${environment.apiUrl}/servers`,
        { name: name.trim(), templateId } satisfies CreateServerPayload,
        { headers },
      ),
    );
  }

  /**
   * Lấy danh sách máy chủ của người dùng qua GET /api/servers kèm token xác thực.
   */
  async listServers(): Promise<ServerWithChannels[]> {
    const token = this.auth.accessToken();
    if (!token) {
      return [];
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return firstValueFrom(
      this.http.get<ServerWithChannels[]>(`${environment.apiUrl}/servers`, { headers }),
    );
  }

  /**
   * Tạo kênh mới trong một máy chủ cụ thể qua POST /api/servers/:serverId/channels.
   */
  async createChannel(
    serverId: string,
    name: string,
    type: 'text' | 'voice' = 'text',
    topic?: string,
  ): Promise<ChannelSummary> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const payload: CreateChannelPayload = {
      name: name.trim(),
      type,
      topic: topic?.trim() || undefined,
    };

    return firstValueFrom(
      this.http.post<ChannelSummary>(
        `${environment.apiUrl}/servers/${serverId}/channels`,
        payload,
        { headers },
      ),
    );
  }

  /**
   * Lấy quyền capabilities của user trong server: GET /api/servers/:serverId/capabilities
   */
  async getCapabilities(serverId: string): Promise<CurrentServerCapabilities> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.get<CurrentServerCapabilities>(
        `${environment.apiUrl}/servers/${serverId}/capabilities`,
        { headers },
      ),
    );
  }

  /**
   * Lấy danh sách bạn bè để mời vào server: GET /api/servers/:serverId/invite-candidates
   */
  async getInviteCandidates(serverId: string): Promise<ServerInviteCandidateDto[]> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.get<ServerInviteCandidateDto[]>(
        `${environment.apiUrl}/servers/${serverId}/invite-candidates`,
        { headers },
      ),
    );
  }

  /**
   * Gửi lời mời trực tiếp cho bạn bè: POST /api/servers/:serverId/invitations
   */
  async createDirectInvitation(
    serverId: string,
    inviteeId: string,
  ): Promise<DirectServerInvitationDto> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.post<DirectServerInvitationDto>(
        `${environment.apiUrl}/servers/${serverId}/invitations`,
        { inviteeId },
        { headers },
      ),
    );
  }

  /**
   * Thu hồi lời mời trực tiếp: DELETE /api/servers/:serverId/invitations/:id
   */
  async revokeDirectInvitation(
    serverId: string,
    invitationId: string,
  ): Promise<{ success: boolean }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.delete<{ success: boolean }>(
        `${environment.apiUrl}/servers/${serverId}/invitations/${invitationId}`,
        { headers },
      ),
    );
  }

  /**
   * Tạo liên kết mời: POST /api/servers/:serverId/invites
   */
  async createInviteLink(
    serverId: string,
    dto?: CreateServerInviteLinkDto,
  ): Promise<ServerInviteLinkResponseDto> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.post<ServerInviteLinkResponseDto>(
        `${environment.apiUrl}/servers/${serverId}/invites`,
        dto ?? {},
        { headers },
      ),
    );
  }

  /**
   * Thu hồi liên kết mời: DELETE /api/servers/:serverId/invites/:code
   */
  async revokeInviteLink(
    serverId: string,
    code: string,
  ): Promise<{ success: boolean }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.delete<{ success: boolean }>(
        `${environment.apiUrl}/servers/${serverId}/invites/${code}`,
        { headers },
      ),
    );
  }

  /**
   * Danh sách lời mời pending của current user: GET /api/server-invitations
   */
  async listPendingInvitations(): Promise<DirectServerInvitationDto[]> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.get<DirectServerInvitationDto[]>(
        `${environment.apiUrl}/server-invitations`,
        { headers },
      ),
    );
  }

  /**
   * Chấp nhận lời mời trực tiếp: POST /api/server-invitations/:id/accept
   */
  async acceptInvitation(
    id: string,
  ): Promise<{ success: boolean; serverId: string; alreadyMember: boolean }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.post<{ success: boolean; serverId: string; alreadyMember: boolean }>(
        `${environment.apiUrl}/server-invitations/${id}/accept`,
        {},
        { headers },
      ),
    );
  }

  /**
   * Từ chối lời mời trực tiếp: POST /api/server-invitations/:id/decline
   */
  async declineInvitation(id: string): Promise<{ success: boolean }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.post<{ success: boolean }>(
        `${environment.apiUrl}/server-invitations/${id}/decline`,
        {},
        { headers },
      ),
    );
  }

  /**
   * Xem trước thông tin liên kết mời (công khai): GET /api/invites/:code
   */
  async getInvitePreview(code: string): Promise<ServerInvitePreviewDto> {
    return firstValueFrom(
      this.http.get<ServerInvitePreviewDto>(`${environment.apiUrl}/invites/${code}`),
    );
  }

  /**
   * Tham gia máy chủ qua liên kết mời: POST /api/invites/:code/join
   */
  async joinByInviteCode(
    code: string,
  ): Promise<{ success: boolean; serverId: string; channelId?: string; alreadyMember: boolean }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.post<{ success: boolean; serverId: string; channelId?: string; alreadyMember: boolean }>(
        `${environment.apiUrl}/invites/${code}/join`,
        {},
        { headers },
      ),
    );
  }

  /**
   * Xóa máy chủ (Chỉ dành cho Owner): DELETE /api/servers/:serverId
   */
  async deleteServer(serverId: string): Promise<{ success: boolean; serverId: string }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.delete<{ success: boolean; serverId: string }>(
        `${environment.apiUrl}/servers/${serverId}`,
        { headers },
      ),
    );
  }

  /**
   * Rời khỏi máy chủ (Chỉ dành cho Non-Owner): DELETE /api/servers/:serverId/members/@me
   */
  async leaveServer(
    serverId: string,
  ): Promise<{ success: boolean; serverId: string; alreadyLeft: boolean }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.delete<{ success: boolean; serverId: string; alreadyLeft: boolean }>(
        `${environment.apiUrl}/servers/${serverId}/members/@me`,
        { headers },
      ),
    );
  }

  /**
   * Lấy danh sách thành viên máy chủ: GET /api/servers/:serverId/members
   */
  async getServerMembers(serverId: string): Promise<ServerMemberDto[]> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.get<ServerMemberDto[]>(
        `${environment.apiUrl}/servers/${serverId}/members`,
        { headers },
      ),
    );
  }

  /**
   * Cập nhật thông tin kênh: PATCH /api/servers/:serverId/channels/:channelId
   */
  async updateChannel(
    serverId: string,
    channelId: string,
    dto: { name?: string; topic?: string; position?: number },
  ): Promise<ChannelSummary> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.patch<ChannelSummary>(
        `${environment.apiUrl}/servers/${serverId}/channels/${channelId}`,
        dto,
        { headers },
      ),
    );
  }

  /**
   * Xóa kênh máy chủ: DELETE /api/servers/:serverId/channels/:channelId
   */
  async deleteChannel(
    serverId: string,
    channelId: string,
  ): Promise<{ success: boolean; channelId: string }> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return firstValueFrom(
      this.http.delete<{ success: boolean; channelId: string }>(
        `${environment.apiUrl}/servers/${serverId}/channels/${channelId}`,
        { headers },
      ),
    );
  }
}


