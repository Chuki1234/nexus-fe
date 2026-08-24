import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LightboxGalleryModal } from './lightbox-gallery-modal';
import type { LightboxGalleryConfig, LightboxMediaItem } from './lightbox-gallery.types';

@Component({
  imports: [LightboxGalleryModal],
  template: `
    <app-lightbox-gallery-modal
      [config]="config()"
      (closed)="onClosed()"
    />
  `,
})
class HostComponent {
  readonly config = signal<LightboxGalleryConfig>({
    items: [],
  });
  closedCalled = false;

  onClosed(): void {
    this.closedCalled = true;
  }
}

describe('LightboxGalleryModal', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const sampleItems: LightboxMediaItem[] = [
    {
      messageId: 'msg-1',
      attachmentId: 'att-1',
      filename: 'photo-1.png',
      mimeType: 'image/png',
      url: 'https://example.com/photo-1.png',
      sizeBytes: 1024 * 50,
    },
    {
      messageId: 'msg-2',
      attachmentId: 'att-2',
      filename: 'photo-2.jpg',
      mimeType: 'image/jpeg',
      url: 'https://example.com/photo-2.jpg',
      sizeBytes: 1024 * 120,
    },
    {
      messageId: 'msg-3',
      attachmentId: 'att-3',
      filename: 'animation.gif',
      mimeType: 'image/gif',
      url: 'https://example.com/animation.gif',
      sizeBytes: 1024 * 200,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LightboxGalleryModal],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('khởi tạo với initialActiveId và hiển thị counter chính xác (2 / 3)', () => {
    host.config.set({
      items: sampleItems,
      initialActiveId: { messageId: 'msg-2', attachmentId: 'att-2' },
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('photo-2.jpg');
    expect(root.textContent).toContain('2 / 3');

    const img = root.querySelector('.nexus-lightbox-main-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe('https://example.com/photo-2.jpg');
  });

  it('nút Prev/Next chuyển ảnh đúng chỉ số và dừng ở biên', () => {
    host.config.set({
      items: sampleItems,
      initialIndex: 0,
    });
    fixture.detectChanges();

    const prevBtn = fixture.nativeElement.querySelector('.nexus-lightbox-nav-btn--prev') as HTMLButtonElement;
    const nextBtn = fixture.nativeElement.querySelector('.nexus-lightbox-nav-btn--next') as HTMLButtonElement;

    // Tại index 0: prev disabled, next enabled
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    // Bấm Next -> sang index 1
    nextBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 / 3');
    expect(prevBtn.disabled).toBe(false);

    // Bấm Next -> sang index 2 (cuối)
    nextBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 / 3');
    expect(nextBtn.disabled).toBe(true);
  });

  it('ẩn nút điều hướng và thumbnail strip khi chỉ có 1 ảnh duy nhất', () => {
    host.config.set({
      items: [sampleItems[0]],
    });
    fixture.detectChanges();

    const prevBtn = fixture.nativeElement.querySelector('.nexus-lightbox-nav-btn--prev');
    const nextBtn = fixture.nativeElement.querySelector('.nexus-lightbox-nav-btn--next');
    const strip = fixture.nativeElement.querySelector('.nexus-lightbox-strip-container');

    expect(prevBtn).toBeNull();
    expect(nextBtn).toBeNull();
    expect(strip).toBeNull();
  });

  it('hỗ trợ điều hướng bằng phím tắt ArrowLeft, ArrowRight, Home, End, Escape', () => {
    host.config.set({
      items: sampleItems,
      initialIndex: 1,
    });
    fixture.detectChanges();

    // ArrowRight -> index 2
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 / 3');

    // Home -> index 0
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 / 3');

    // End -> index 2
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 / 3');

    // Escape -> gọi đóng gallery
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.closedCalled).toBe(true);
  });

  it('bấm vào thumbnail chuyển trực tiếp tới ảnh tương ứng', () => {
    host.config.set({
      items: sampleItems,
      initialIndex: 0,
    });
    fixture.detectChanges();

    const thumbs = fixture.nativeElement.querySelectorAll('.nexus-lightbox-thumb-btn') as NodeListOf<HTMLButtonElement>;
    expect(thumbs.length).toBe(3);

    // Bấm thumbnail số 3 (animation.gif)
    thumbs[2].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('animation.gif');
    expect(fixture.nativeElement.textContent).toContain('3 / 3');
  });

  it('tự động retry làm mới URL khi tải ảnh thất bại mà không đóng modal', async () => {
    const refreshAttachmentUrl = vi.fn().mockResolvedValue('https://example.com/fresh-photo-1.png');

    host.config.set({
      items: sampleItems,
      initialIndex: 0,
      refreshAttachmentUrl,
    });
    fixture.detectChanges();

    const modal = fixture.debugElement.children[0].componentInstance as LightboxGalleryModal;

    // Giả lập lỗi ảnh
    await modal.onImageError();
    fixture.detectChanges();

    expect(refreshAttachmentUrl).toHaveBeenCalledWith('msg-1', 'att-1');
    expect(modal.activeItem()?.url).toBe('https://example.com/fresh-photo-1.png');
    expect(modal.isFailed()).toBe(false);
  });

  it('gọi callback onDownload khi bấm nút tải ảnh gốc', async () => {
    const onDownload = vi.fn().mockResolvedValue(undefined);

    host.config.set({
      items: sampleItems,
      initialIndex: 0,
      onDownload,
    });
    fixture.detectChanges();

    const modal = fixture.debugElement.children[0].componentInstance as LightboxGalleryModal;
    await modal.onDownloadClick();

    expect(onDownload).toHaveBeenCalledWith(sampleItems[0]);
  });
});
