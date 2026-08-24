import { beforeEach, describe, expect, it } from 'vitest';
import { getAndClearReturnUrl, sanitizeReturnUrl, saveReturnUrl } from './auth-redirect.util';

describe('AuthRedirectUtil', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  describe('sanitizeReturnUrl', () => {
    it('returns valid relative path as-is', () => {
      expect(sanitizeReturnUrl('/invite/code-123')).toBe('/invite/code-123');
      expect(sanitizeReturnUrl('/channels/srv-1/chan-2')).toBe('/channels/srv-1/chan-2');
      expect(sanitizeReturnUrl('/')).toBe('/');
    });

    it('falls back to defaultUrl for invalid or malicious URLs', () => {
      expect(sanitizeReturnUrl(null)).toBe('/');
      expect(sanitizeReturnUrl(undefined)).toBe('/');
      expect(sanitizeReturnUrl('')).toBe('/');
      expect(sanitizeReturnUrl('   ')).toBe('/');
      expect(sanitizeReturnUrl('https://malicious-site.com')).toBe('/');
      expect(sanitizeReturnUrl('http://evil.com/invite/123')).toBe('/');
      expect(sanitizeReturnUrl('//evil.com/invite/123')).toBe('/');
      expect(sanitizeReturnUrl('/\\evil.com')).toBe('/');
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/');
    });
  });

  describe('saveReturnUrl and getAndClearReturnUrl', () => {
    it('saves sanitized returnUrl to sessionStorage and retrieves it cleanly', () => {
      saveReturnUrl('/invite/my-secret-code');
      const retrieved = getAndClearReturnUrl();
      expect(retrieved).toBe('/invite/my-secret-code');

      // Subsequent call should have cleared the storage
      expect(getAndClearReturnUrl()).toBe('/');
    });

    it('prioritizes valid fallbackParam if provided, cleaning storage', () => {
      saveReturnUrl('/invite/stored-code');
      const retrieved = getAndClearReturnUrl('/invite/param-code');
      expect(retrieved).toBe('/invite/param-code');
      expect(window.sessionStorage.getItem('nexus_return_url')).toBeNull();
    });

    it('uses stored returnUrl when fallbackParam is default or invalid', () => {
      saveReturnUrl('/invite/stored-code');
      const retrieved = getAndClearReturnUrl('https://evil.com');
      expect(retrieved).toBe('/invite/stored-code');
    });
  });
});
