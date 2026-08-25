import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-add-friend-form',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './add-friend-form.html',
  styleUrl: './add-friend-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AddFriendForm {
  readonly pending = input(false);
  readonly error = input<string | null>(null);
  readonly feedback = input<string | null>(null);
  readonly submitted = output<string>();

  protected readonly username = new FormControl('', {
    nonNullable: true,
  });

  protected submit(): void {
    const normalized = this.username.value.trim().toLowerCase();
    if (!normalized || this.pending()) return;
    this.submitted.emit(normalized);
  }
}
