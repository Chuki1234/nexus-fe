import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DwellTracker,
  HitZoneCalculator,
  type ServerDropIntent,
} from './server-drop-intent';

describe('ServerDropIntent and HitZoneCalculator', () => {
  describe('HitZoneCalculator', () => {
    const targetRect = {
      top: 100,
      bottom: 200,
      height: 100,
    };

    it('should identify top 25% zone correctly', () => {
      // 100 to 125 is top
      const zone = HitZoneCalculator.compute(110, targetRect);
      expect(zone).toBe('top');
    });

    it('should identify middle 50% zone correctly', () => {
      // 125 to 175 is middle
      const zone = HitZoneCalculator.compute(150, targetRect);
      expect(zone).toBe('middle');
    });

    it('should identify bottom 25% zone correctly', () => {
      // 175 to 200 is bottom
      const zone = HitZoneCalculator.compute(185, targetRect);
      expect(zone).toBe('bottom');
    });

    it('should apply hysteresis to prevent jitter when transitioning from top', () => {
      // With 4px hysteresis, top zone threshold increases from 125 to 129
      const withoutHysteresis = HitZoneCalculator.compute(127, targetRect, null, 0);
      expect(withoutHysteresis).toBe('middle');

      const withHysteresis = HitZoneCalculator.compute(127, targetRect, 'top', 4);
      expect(withHysteresis).toBe('top');
    });

    it('should apply hysteresis when transitioning from bottom', () => {
      // With 4px hysteresis, bottom zone threshold decreases from 175 to 171
      const withoutHysteresis = HitZoneCalculator.compute(173, targetRect, null, 0);
      expect(withoutHysteresis).toBe('middle');

      const withHysteresis = HitZoneCalculator.compute(173, targetRect, 'bottom', 4);
      expect(withHysteresis).toBe('bottom');
    });
  });

  describe('DwellTracker', () => {
    let tracker: DwellTracker;

    beforeEach(() => {
      vi.useFakeTimers();
      tracker = new DwellTracker();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start session and assign session token', () => {
      const token = tracker.startSession('server-1');
      expect(token).toBeGreaterThan(0);
      expect(tracker.activeSourceId).toBe('server-1');
    });

    it('should fire callback after dwellMs when not interrupted', () => {
      tracker.startSession('server-1');
      let callbackFired = false;
      let firedToken = 0;

      const dwellToken = tracker.scheduleDwell('server-2', 280, (token) => {
        callbackFired = true;
        firedToken = token;
      });

      expect(callbackFired).toBe(false);
      vi.advanceTimersByTime(200);
      expect(callbackFired).toBe(false);

      vi.advanceTimersByTime(90);
      expect(callbackFired).toBe(true);
      expect(firedToken).toBe(dwellToken);
    });

    it('should cancel dwell when cancelDwell is called (Fast Pass)', () => {
      tracker.startSession('server-1');
      let callbackFired = false;

      tracker.scheduleDwell('server-2', 280, () => {
        callbackFired = true;
      });

      vi.advanceTimersByTime(100);
      tracker.cancelDwell();
      vi.advanceTimersByTime(200);

      expect(callbackFired).toBe(false);
    });

    it('should cancel dwell when ending session (Escape / Drop)', () => {
      tracker.startSession('server-1');
      let callbackFired = false;

      tracker.scheduleDwell('server-2', 280, () => {
        callbackFired = true;
      });

      vi.advanceTimersByTime(100);
      tracker.endSession();
      vi.advanceTimersByTime(200);

      expect(callbackFired).toBe(false);
      expect(tracker.activeSourceId).toBeNull();
    });
  });
});
