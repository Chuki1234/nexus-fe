import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectCallStore } from '../../../../core/calls/direct-call.store';
import { DirectCallCoordinatorService } from '../../../../core/calls/direct-call-coordinator.service';

@Component({
  selector: 'app-incoming-call-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './incoming-call-overlay.component.html',
  styleUrls: ['./incoming-call-overlay.component.css'],
})
export class IncomingCallOverlayComponent implements OnInit, OnDestroy {
  readonly store = inject(DirectCallStore);
  readonly coordinator = inject(DirectCallCoordinatorService);

  @ViewChild('acceptBtn') acceptBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('declineBtn') declineBtn!: ElementRef<HTMLButtonElement>;

  readonly call = computed(() => this.store.activeCall());
  readonly caller = computed(() => this.call()?.caller ?? null);
  readonly initialMode = computed(() => this.store.initialMode());

  readonly remainingSeconds = signal<number>(45);
  private countdownTimer: any = null;

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.remainingSeconds.set(45);
    this.countdownTimer = setInterval(() => {
      this.remainingSeconds.update((s) => {
        if (s <= 1) {
          this.stopCountdown();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      void this.coordinator.declineCall();
    }
  }

  onAccept(): void {
    void this.coordinator.answerCall();
  }

  onDecline(): void {
    void this.coordinator.declineCall();
  }
}
