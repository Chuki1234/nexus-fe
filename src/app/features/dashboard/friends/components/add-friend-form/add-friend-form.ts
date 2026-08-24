import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { USERNAME_PATTERN } from '../../../../../../shared/dto/auth';

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
  readonly demoMode = input(false);
  readonly submitted = output<string>();

  protected readonly username = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(32),
      Validators.pattern(USERNAME_PATTERN),
    ],
  });

  protected submit(): void {
    const normalized = this.username.value.trim().toLowerCase();
    this.username.setValue(normalized);
    this.username.markAsTouched();
    if (this.username.invalid || this.pending() || this.demoMode()) return;
    this.submitted.emit(normalized);
  }
}
