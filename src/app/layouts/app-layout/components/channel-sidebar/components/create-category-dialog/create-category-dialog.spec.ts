import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { ServersStore } from '../../../../../../core/servers/servers.store';
import { CreateCategoryDialog } from './create-category-dialog';

describe('CreateCategoryDialog', () => {
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let serversStore: ServersStore;

  const mount = async (data = { serverId: 'server-1', serverName: 'Test Server' }) => {
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CreateCategoryDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    serversStore = TestBed.inject(ServersStore);
    const fixture = TestBed.createComponent(CreateCategoryDialog);
    fixture.detectChanges();
    return fixture;
  };

  it('dựng dialog với tiêu đề Tạo Danh Mục và nút Tạo Danh Mục disabled khi chưa nhập tên', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent.toLowerCase()).toContain('tạo danh mục');
    expect(fixture.nativeElement.textContent.toLowerCase()).toContain('tên danh mục');
    expect(fixture.nativeElement.textContent.toLowerCase()).toContain('danh mục riêng');

    const submitBtn = fixture.nativeElement.querySelector(
      '.nexus-create-category-btn',
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('khi nhập tên danh mục hợp lệ thì submit tạo category và thêm vào ServersStore', async () => {
    const fixture = await mount();

    const input = fixture.nativeElement.querySelector(
      '#create-category-name-input',
    ) as HTMLInputElement;
    input.value = 'HỌC TẬP';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      '.nexus-create-category-btn',
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    submitBtn.click();
    fixture.detectChanges();

    expect(mockDialogRef.close).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HỌC TẬP',
        isPrivate: false,
      }),
    );

    const categories = serversStore.categoriesOf('server-1');
    expect(categories.some((c) => c.name === 'HỌC TẬP')).toBe(true);
  });
});
