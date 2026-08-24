import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TrackPublication } from 'livekit-client';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { VoiceParticipantModel } from '../../../services/voice-room.service';

@Component({
  selector: 'app-participant-tile',
  imports: [Avatar, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participant-tile.html',
  styleUrl: './participant-tile.css',
  host: {
    class: 'block size-full min-h-0',
  },
})
export class ParticipantTile implements OnDestroy {
  readonly participant = input.required<VoiceParticipantModel>();
  readonly isScreenShare = input<boolean>(false);

  readonly watchStream = output<string>();

  private readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  private currentAttachedTrack: TrackPublication | null = null;

  constructor() {
    effect(() => {
      const p = this.participant();
      const el = this.videoElement()?.nativeElement;
      const pub = this.isScreenShare() ? p.screenSharePublication : p.videoPublication;

      if (el && pub?.track) {
        if (this.currentAttachedTrack !== pub) {
          this.detachCurrentTrack();
          pub.track.attach(el);
          this.currentAttachedTrack = pub;
        }
      } else {
        this.detachCurrentTrack();
      }
    });
  }

  private detachCurrentTrack(): void {
    if (this.currentAttachedTrack?.track) {
      try {
        const el = this.videoElement()?.nativeElement;
        if (el) {
          this.currentAttachedTrack.track.detach(el);
        }
      } catch (err) {
        console.warn('Lỗi khi detach track:', err);
      }
      this.currentAttachedTrack = null;
    }
  }

  ngOnDestroy(): void {
    this.detachCurrentTrack();
  }
}
