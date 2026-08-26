import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ServerCategorySummary } from '../../../../../../core/servers/server.models';
import { ServersStore } from '../../../../../../core/servers/servers.store';

export interface CreateCategoryDialogData {
  serverId: string;
  serverName?: string;
}

@Component({
  selector: 'app-create-category-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-category-dialog.html',
  styleUrl: './create-category-dialog.css',
})
export class CreateCategoryDialog {
  readonly dialogRef = inject(
    MatDialogRef<CreateCategoryDialog, ServerCategorySummary | null>,
  );
  readonly data = inject<CreateCategoryDialogData>(MAT_DIALOG_DATA);
  private readonly serversStore = inject(ServersStore);

  protected readonly categoryName = signal('');
  protected readonly isPrivate = signal(false);

  protected readonly isNameValid = computed(() => {
    return this.categoryName().trim().length >= 1;
  });

  protected onSubmit(): void {
    const name = this.categoryName().trim();
    if (!name) return;

    const category: ServerCategorySummary = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      isPrivate: this.isPrivate(),
    };

    this.serversStore.addCategory(this.data.serverId, category);
    this.dialogRef.close(category);
  }
}
