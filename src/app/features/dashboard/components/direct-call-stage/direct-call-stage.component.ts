import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
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

  ngAfterViewInit(): void {
    // Initial bindings handled via setters
  }

  ngOnDestroy(): void {
    // cleanup
  }
}
