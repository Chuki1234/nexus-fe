import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectCallStore } from '../../../../core/calls/direct-call.store';
import { DirectCallCoordinatorService } from '../../../../core/calls/direct-call-coordinator.service';
import { DirectCallMediaService } from '../../../../core/calls/direct-call-media.service';
import { DraggableSelfViewComponent } from '../draggable-self-view/draggable-self-view.component';
import { DirectCallControlsComponent } from '../direct-call-controls/direct-call-controls.component';

@Component({
  selector: 'app-direct-call-stage',
  standalone: true,
  imports: [CommonModule, DraggableSelfViewComponent, DirectCallControlsComponent],
  templateUrl: './direct-call-stage.component.html',
  styleUrls: ['./direct-call-stage.component.css'],
})
export class DirectCallStageComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(DirectCallStore);
  readonly coordinator = inject(DirectCallCoordinatorService);
  readonly mediaService = inject(DirectCallMediaService);

  readonly isControlsVisible = signal<boolean>(true);
  private hideTimer: any = null;

  @ViewChild('remoteVideo') set remoteVideoElement(ref: ElementRef<HTMLVideoElement> | undefined) {
    if (ref?.nativeElement) {
      this.mediaService.attachRemoteVideo(ref.nativeElement);
    }
  }

  @ViewChild('remoteAudio') set remoteAudioElement(ref: ElementRef<HTMLAudioElement> | undefined) {
    if (ref?.nativeElement) {
      this.mediaService.attachRemoteAudio(ref.nativeElement);
    }
  }

  readonly remoteUser = computed(() => this.store.remoteParticipant());

  readonly statusText = computed(() => {
    const state = this.store.callState();
    switch (state) {
      case 'outgoing_ringing':
        return 'Đang đổ chuông...';
      case 'preflighting':
        return 'Đang chuẩn bị thiết bị...';
      case 'connecting':
        return 'Đang kết nối...';
      case 'connected':
        return 'Đã kết nối';
      case 'reconnecting':
        return 'Đang kết nối lại...';
      case 'ended':
        return 'Cuộc gọi đã kết thúc';
      default:
        return '';
    }
  });

  @HostListener('mousemove')
  @HostListener('touchstart')
  @HostListener('click')
  onUserActivity(): void {
    this.showControls();
  }

  showControls(): void {
    this.isControlsVisible.set(true);
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    if (this.store.isConnected()) {
      this.hideTimer = setTimeout(() => {
        this.isControlsVisible.set(false);
      }, 3500);
    }
  }

  ngAfterViewInit(): void {
    // Initial bindings handled via setters
  }

  ngOnDestroy(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
  }
}
