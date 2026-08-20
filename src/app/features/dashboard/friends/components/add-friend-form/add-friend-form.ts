import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
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
  protected readonly username = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(32)],
  });
  protected readonly submitted = signal(false);

  protected submitPreview(): void {
    this.username.markAsTouched();
    if (this.username.invalid) return;
    this.submitted.set(true);
  }
}
