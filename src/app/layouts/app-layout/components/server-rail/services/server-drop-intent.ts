export type ServerDropIntent =
  | { kind: 'none' }
  | { kind: 'insert-before'; sourceServerId: string; targetId: string; parentGroupId?: string }
  | { kind: 'insert-after'; sourceServerId: string; targetId: string; parentGroupId?: string }
  | {
      kind: 'merge-pending';
      sourceServerId: string;
      targetId: string;
      targetKind: 'server' | 'folder';
      dwellToken: number;
    }
  | { kind: 'merge-server'; sourceServerId: string; targetServerId: string }
  | { kind: 'insert-group'; sourceServerId: string; targetGroupId: string; index?: number }
  | { kind: 'detach-to-rail'; sourceServerId: string; railIndex: number };

export interface ServerDropResult {
  action: 'reorder-rail' | 'create-group' | 'add-to-group' | 'reorder-group' | 'detach-from-group';
  sourceServerName: string;
  targetName?: string;
  finalIndex: number;
  groupId?: string;
}

export type HitZone = 'top' | 'middle' | 'bottom';

export class HitZoneCalculator {
  /**
   * Tính toán vùng hit zone (top 25%, middle 50%, bottom 25%) kèm hysteresis 4px
   * để tránh rung giật intent (intent jitter) tại các ranh giới.
   */
  static compute(
    pointerY: number,
    targetRect: DOMRect | { top: number; bottom: number; height: number },
    previousZone: HitZone | null = null,
    hysteresisPx = 4,
  ): HitZone {
    const height = targetRect.height;
    if (height <= 0) return 'middle';

    const relativeY = pointerY - targetRect.top;
    let topThreshold = height * 0.25;
    let bottomThreshold = height * 0.75;

    if (previousZone === 'top') {
      topThreshold += hysteresisPx;
    } else if (previousZone === 'middle') {
      topThreshold -= hysteresisPx;
      bottomThreshold += hysteresisPx;
    } else if (previousZone === 'bottom') {
      bottomThreshold -= hysteresisPx;
    }

    if (relativeY <= topThreshold) {
      return 'top';
    }
    if (relativeY >= bottomThreshold) {
      return 'bottom';
    }
    return 'middle';
  }
}

export class DwellTracker {
  private currentSessionToken = 0;
  private currentDwellToken = 0;
  private dwellTimer: ReturnType<typeof setTimeout> | null = null;
  private isDragging = false;
  private currentSourceId: string | null = null;
  private currentTargetId: string | null = null;

  startSession(sourceServerId: string): number {
    this.cancelDwell();
    this.currentSessionToken += 1;
    this.isDragging = true;
    this.currentSourceId = sourceServerId;
    this.currentTargetId = null;
    return this.currentSessionToken;
  }

  endSession(): void {
    this.cancelDwell();
    this.isDragging = false;
    this.currentSourceId = null;
    this.currentTargetId = null;
  }

  get sessionToken(): number {
    return this.currentSessionToken;
  }

  get activeSourceId(): string | null {
    return this.currentSourceId;
  }

  get activeTargetId(): string | null {
    return this.currentTargetId;
  }

  /**
   * Khởi động bộ đếm dwell (mặc định 280ms) cho middle zone.
   */
  scheduleDwell(
    targetId: string,
    dwellMs = 280,
    onDwellMet: (token: number) => void,
  ): number {
    this.cancelDwell();
    this.currentTargetId = targetId;
    this.currentDwellToken += 1;

    const sessionToken = this.currentSessionToken;
    const dwellToken = this.currentDwellToken;
    const sourceId = this.currentSourceId;

    this.dwellTimer = setTimeout(() => {
      if (
        this.isDragging &&
        this.currentSessionToken === sessionToken &&
        this.currentDwellToken === dwellToken &&
        this.currentSourceId === sourceId &&
        this.currentTargetId === targetId
      ) {
        onDwellMet(dwellToken);
      }
    }, dwellMs);

    return dwellToken;
  }

  cancelDwell(): void {
    if (this.dwellTimer !== null) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
    this.currentTargetId = null;
  }
}
