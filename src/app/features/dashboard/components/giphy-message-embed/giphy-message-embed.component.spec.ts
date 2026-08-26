import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GiphyMediaDto } from '../../../../../shared/dto/messages.dto';
import { GiphyMessageEmbedComponent } from './giphy-message-embed.component';

describe('GiphyMessageEmbedComponent', () => {
  let component: GiphyMessageEmbedComponent;
  let fixture: ComponentFixture<GiphyMessageEmbedComponent>;

  const sampleMedia: GiphyMediaDto = {
    provider: 'giphy',
    externalId: 'test1234',
    mediaType: 'gif',
    title: 'Happy Dance Cat',
    creatorUsername: 'catvibes',
    pageUrl: 'https://giphy.com/gifs/cat-test1234',
    previewUrl: 'https://media0.giphy.com/media/test1234/200w.webp',
    displayUrl: 'https://media0.giphy.com/media/test1234/giphy.gif',
    mp4Url: 'https://media1.giphy.com/media/test1234/giphy.mp4',
    width: 480,
    height: 360,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GiphyMessageEmbedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GiphyMessageEmbedComponent);
    component = fixture.componentInstance;
    component.media = sampleMedia;
    fixture.detectChanges();
  });

  it('hiển thị thẻ video khi có mp4Url', () => {
    const videoEl = fixture.nativeElement.querySelector('video');
    expect(videoEl).toBeTruthy();
    expect(videoEl.src).toContain('https://media1.giphy.com/media/test1234/giphy.mp4');
  });

  it('chuyển sang fallback img khi video gặp lỗi tải', () => {
    component.onVideoError();
    fixture.detectChanges();

    const videoEl = fixture.nativeElement.querySelector('video');
    const imgEl = fixture.nativeElement.querySelector('img');
    expect(videoEl).toBeNull();
    expect(imgEl).toBeTruthy();
    expect(imgEl.src).toContain('https://media0.giphy.com/media/test1234/giphy.gif');
  });

  it('tính toán aspect-ratio đúng dựa trên width và height', () => {
    expect(component.aspectRatioStyle()).toBe('480 / 360');
  });

  it('hiển thị container GIF sạch sẽ với kích thước tối đa 480px', () => {
    const wrapperEl: HTMLElement = fixture.nativeElement.querySelector('.giphy-embed-wrapper');
    expect(wrapperEl).toBeTruthy();
    expect(component.media?.width).toBe(480);
    expect(component.media?.height).toBe(360);
  });

  it('mở LightboxGallery khi người dùng click vào ảnh GIF', () => {
    const lightboxService = (component as any).lightbox;
    const openSpy = vi.spyOn(lightboxService, 'open').mockReturnValue({} as any);

    const wrapperEl: HTMLElement = fixture.nativeElement.querySelector('.giphy-embed-wrapper');
    wrapperEl.click();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            mimeType: 'image/gif',
            url: 'https://media0.giphy.com/media/test1234/giphy.gif',
            filename: 'Happy Dance Cat.gif',
          }),
        ]),
      }),
    );
  });
});
