import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractClipboardMessage } from './message-clipboard.util';

describe('message clipboard utility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('chuyển đổi HTML có chữ in đậm và in nghiêng sang Markdown chuẩn', async () => {
    const clipboard = {
      files: [],
      items: [],
      getData: (type: string) => {
        if (type === 'text/html') {
          return '<p><strong>GIỜ LÀNH ĐÃ ĐIỂM</strong> và <em>lưu ý</em> nội dung</p>';
        }
        return 'GIỜ LÀNH ĐÃ ĐIỂM và lưu ý nội dung';
      },
    } as unknown as DataTransfer;

    const payload = await extractClipboardMessage(clipboard);
    expect(payload.text).toBe('**GIỜ LÀNH ĐÃ ĐIỂM** và *lưu ý* nội dung');
    expect(payload.hasRichContent).toBe(true);
  });

  it('ưu tiên nhãn hiển thị của thẻ mention Discord thay vì token raw ID', async () => {
    const clipboard = {
      files: [],
      items: [],
      getData: (type: string) => {
        if (type === 'text/plain') return 'Deadline <@&1525042460223606895>';
        if (type === 'text/html') {
          return '<div>Deadline <span class="mention" aria-label="@Web26A-246">@Web26A-246</span></div>';
        }
        return '';
      },
    } as unknown as DataTransfer;

    const payload = await extractClipboardMessage(clipboard);

    expect(payload.text).toBe('Deadline @Web26A-246');
    expect(payload.text).not.toContain('<@&');
  });

  it('chuyển link PDF trong rich clipboard thành File thay vì dán filename như text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['pdf-content'], { type: 'application/pdf' }), { status: 200 }),
    );
    const clipboard = {
      files: [],
      items: [],
      getData: (type: string) => {
        if (type === 'text/plain') return 'Đọc tài liệu\nde-bai-recipe-app.md.pdf';
        if (type === 'text/html') {
          return '<p>Đọc tài liệu</p><a href="https://cdn.discordapp.com/attachments/123/de-bai-recipe-app.md.pdf">de-bai-recipe-app.md.pdf</a>';
        }
        return '';
      },
    } as unknown as DataTransfer;

    const payload = await extractClipboardMessage(clipboard);

    expect(payload.text).toBe('Đọc tài liệu');
    expect(payload.files).toHaveLength(1);
    expect(payload.files[0].name).toBe('de-bai-recipe-app.md.pdf');
    expect(payload.files[0].type).toBe('application/pdf');
    expect(payload.failedResourceCount).toBe(0);
  });

  it('báo số attachment không thể tải khi CDN bên ngoài chặn CORS và giữ lại link trong văn bản', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('CORS blocked'));
    const clipboard = {
      files: [],
      items: [],
      getData: (type: string) =>
        type === 'text/html'
          ? '<p>Nội dung</p><a href="https://private.example.com/report.docx">report.docx</a>'
          : 'Nội dung\nreport.docx',
    } as unknown as DataTransfer;

    const payload = await extractClipboardMessage(clipboard);

    expect(payload.text).toBe('Nội dung\n[report.docx](https://private.example.com/report.docx)');
    expect(payload.files).toEqual([]);
    expect(payload.failedResourceCount).toBe(1);
  });

  it('không tải lại ảnh nếu clipboard đã cung cấp binary File', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const existingFile = new File(['img'], 'screenshot.png', { type: 'image/png' });
    const clipboard = {
      files: [existingFile],
      items: [],
      getData: (type: string) =>
        type === 'text/html'
          ? '<p>Ảnh chụp</p><img src="https://cdn.example.com/screenshot.png" alt="screenshot" />'
          : 'Ảnh chụp',
    } as unknown as DataTransfer;

    const payload = await extractClipboardMessage(clipboard);

    expect(payload.files).toHaveLength(1);
    expect(payload.files[0].name).toBe('screenshot.png');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
