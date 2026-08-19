import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';

interface LanguageOption {
  code: AppPreferences['language'];
  nativeName: string;
  englishName: string;
  flag: string;
}

@Component({
  selector: 'app-language-tab',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-tab.html',
  styleUrl: './language-tab.css',
})
export class LanguageTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected readonly languages: LanguageOption[] = [
    { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', flag: '🇻🇳' },
    { code: 'en', nativeName: 'English (US)', englishName: 'English (US)', flag: '🇺🇸' },
    { code: 'ja', nativeName: '日本語', englishName: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', nativeName: '한국어', englishName: 'Korean', flag: '🇰🇷' },
    { code: 'zh', nativeName: '简体中文', englishName: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'fr', nativeName: 'Français', englishName: 'French', flag: '🇫🇷' },
    { code: 'de', nativeName: 'Deutsch', englishName: 'German', flag: '🇩🇪' },
    { code: 'es', nativeName: 'Español', englishName: 'Spanish', flag: '🇪🇸' },
  ];

  protected selectLanguage(code: AppPreferences['language']): void {
    this.settingsService.updatePreference('language', code);
  }

  protected setTimeFormat(format: AppPreferences['timeFormat']): void {
    this.settingsService.updatePreference('timeFormat', format);
  }

  protected setFirstDayOfWeek(day: AppPreferences['firstDayOfWeek']): void {
    this.settingsService.updatePreference('firstDayOfWeek', day);
  }
}
