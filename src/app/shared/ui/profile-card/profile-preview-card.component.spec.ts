import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { describe, expect, it } from 'vitest';
import { InlineTranslateLoader } from '../../../core/i18n/language.service';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/translations';
import { ProfilePreviewCardComponent } from './profile-preview-card.component';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideTranslateService({ lang: DEFAULT_LANGUAGE, fallbackLang: DEFAULT_LANGUAGE }),
      provideTranslateLoader(InlineTranslateLoader),
    ],
  });

  const fixture = TestBed.createComponent(ProfilePreviewCardComponent);
  fixture.componentRef.setInput('displayName', 'Đức Phạm');
  fixture.componentRef.setInput('username', 'ducpham');
  return fixture;
}

describe('ProfilePreviewCardComponent', () => {
  it('hiện đúng tên/username đưa vào qua input, không gọi API nào', () => {
    const fixture = setup();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Đức Phạm');
    expect(text).toContain('ducpham');
  });

  it('hiện lời mời điền khi bio/trạng thái đang trống', () => {
    const fixture = setup();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.length).toBeGreaterThan(0);
    // Không có bio/status → nhánh EmptyFieldComponent render, không phải rỗng trơn.
    expect(fixture.nativeElement.querySelectorAll('app-empty-field').length).toBeGreaterThan(0);
  });

  it('hiện bio thật khi có, không hiện lời mời điền nữa', () => {
    const fixture = setup();
    fixture.componentRef.setInput('bio', 'Xin chào, mình là Đức.');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Xin chào, mình là Đức.');
  });

  it('đổi màu bìa theo accentColor khi chưa có bannerUrl', () => {
    const fixture = setup();
    fixture.componentRef.setInput('accentColor', '#4453c4');
    fixture.detectChanges();

    // jsdom chuẩn hoá hex sang rgb() khi đọc lại style — so khớp theo rgb.
    const banner = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.h-40');
    expect(banner?.style.background).toContain('rgb(68, 83, 196)');
  });

  it('hiện đủ nhãn link + icon khi có links', () => {
    const fixture = setup();
    fixture.componentRef.setInput('links', [{ label: 'GitHub', url: 'https://github.com/ducpham' }]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('GitHub');
  });
});
