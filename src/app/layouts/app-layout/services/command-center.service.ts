import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CommandCenterService {
  private readonly requestOpenSubject = new Subject<void>();

  readonly requestOpen$ = this.requestOpenSubject.asObservable();

  /**
   * Kích hoạt mở modal Điều hướng toàn Nexus (Quick Switcher / Command Center)
   */
  open(): void {
    this.requestOpenSubject.next();
  }
}
