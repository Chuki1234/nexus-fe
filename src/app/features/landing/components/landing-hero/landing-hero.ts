import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingMascot } from '../landing-mascot/landing-mascot';

interface MockMessage {
  readonly author: string;
  readonly initials: string;
  readonly hue: string;
  readonly text: string;
  readonly time: string;
}

@Component({
  selector: 'app-landing-hero',
  imports: [RouterLink, LandingMascot],
  templateUrl: './landing-hero.html',
  styleUrl: './landing-hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHero {
  /** Tin nhắn giả trong mock — trôi vào tuần tự lúc trang tải (chỉ CSS). */
  protected readonly messages: readonly MockMessage[] = [
    {
      author: 'Minh Tài',
      initials: 'MT',
      hue: 'var(--color-brand-green-mid)',
      text: 'Mọi người ơi, deploy xong staging rồi nhé 🚀',
      time: '09:41',
    },
    {
      author: 'Triều Dược',
      initials: 'TD',
      hue: 'var(--color-accent-purple)',
      text: 'Ngon quá! Vào test thử ngay đây',
      time: '09:41',
    },
    {
      author: 'Trường Giang',
      initials: 'TG',
      hue: 'var(--color-accent-orange)',
      text: 'Presence hiện realtime luôn, mượt thật 🔥',
      time: '09:42',
    },
  ];
}
