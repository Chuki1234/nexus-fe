import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { DirectServerInvitationDto } from '../../../../shared/dto/server-invitations.dto';
import { ServerInvitationsStore } from '../../../core/servers/server-invitations.store';
import { ToastService } from '../../../core/toast/toast.service';

@Component({
  selector: 'app-server-invitations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './server-invitations.component.html',
  styleUrl: './server-invitations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerInvitationsComponent implements OnInit {
  protected readonly store = inject(ServerInvitationsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly processingIds = signal<Set<string>>(new Set());

  async ngOnInit(): Promise<void> {
    await this.store.hydrateInvitations();
  }

  isProcessing(id: string): boolean {
    return this.processingIds().has(id);
  }

  async onAccept(invitation: DirectServerInvitationDto): Promise<void> {
    if (this.isProcessing(invitation.id)) return;

    this.setProcessing(invitation.id, true);
    try {
      const res = await this.store.acceptInvitation(invitation.id);
      this.toast.show({
        message: `Đã gia nhập máy chủ "${invitation.serverName}"!`,
        action: 'Mở máy chủ',
        onAction: () => {
          void this.router.navigate(['/channels', res.serverId]);
        },
        type: 'success',
      });
    } catch (err: any) {
      this.toast.show({
        message: err?.error?.message || 'Không thể chấp nhận lời mời. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      this.setProcessing(invitation.id, false);
    }
  }

  async onDecline(invitation: DirectServerInvitationDto): Promise<void> {
    if (this.isProcessing(invitation.id)) return;

    this.setProcessing(invitation.id, true);
    try {
      await this.store.declineInvitation(invitation.id);
      this.toast.show({
        message: `Đã từ chối lời mời vào "${invitation.serverName}".`,
        type: 'info',
      });
    } catch (err: any) {
      this.toast.show({
        message: err?.error?.message || 'Không thể từ chối lời mời.',
        type: 'error',
      });
    } finally {
      this.setProcessing(invitation.id, false);
    }
  }

  private setProcessing(id: string, processing: boolean): void {
    this.processingIds.update((set) => {
      const next = new Set(set);
      if (processing) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  formatExpiresAt(isoDate: string): string {
    if (!isoDate) return '';
    const diffMs = new Date(isoDate).getTime() - Date.now();
    if (diffMs <= 0) return 'Đã hết hạn';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `Hết hạn sau ${diffHours} giờ`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `Hết hạn sau ${diffDays} ngày`;
  }
}
