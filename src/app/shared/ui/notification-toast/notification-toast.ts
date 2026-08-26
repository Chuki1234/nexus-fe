import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, InAppNotification } from '../../../core/notification/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-toast.html',
  styleUrl: './notification-toast.css',
})
export class NotificationToast {
  protected readonly notificationService = inject(NotificationService);

  protected onClickNotification(notif: InAppNotification): void {
    this.notificationService.navigateTo(notif);
  }

  protected dismiss(event: Event, id: string): void {
    event.stopPropagation();
    this.notificationService.dismiss(id);
  }
}
