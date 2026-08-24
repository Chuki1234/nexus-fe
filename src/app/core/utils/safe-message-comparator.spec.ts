import { describe, expect, it } from 'vitest';
import { compareMessageOrder } from './safe-message-comparator';

describe('compareMessageOrder', () => {
  it('sắp xếp chính xác các Snowflake/BigInt numeric IDs', () => {
    const msg1 = { id: '100000000000000001', createdAt: '2026-08-24T10:00:00Z' };
    const msg2 = { id: '100000000000000002', createdAt: '2026-08-24T10:00:00Z' };
    const msg3 = { id: '99999999999999999', createdAt: '2026-08-24T10:00:00Z' };

    expect(compareMessageOrder(msg1, msg2)).toBe(-1);
    expect(compareMessageOrder(msg2, msg1)).toBe(1);
    expect(compareMessageOrder(msg1, msg1)).toBe(0);
    expect(compareMessageOrder(msg3, msg1)).toBe(-1);

    const sorted = [msg2, msg3, msg1].sort(compareMessageOrder);
    expect(sorted.map((m) => m.id)).toEqual([
      '99999999999999999',
      '100000000000000001',
      '100000000000000002',
    ]);
  });

  it('xử lý an toàn optimistic IDs dạng chuỗi hoặc UUID mà không bị crash BigInt', () => {
    const optimistic1 = {
      id: 'temp-1787563400000-abc',
      createdAt: '2026-08-24T10:00:01Z',
    };
    const optimistic2 = {
      id: 'temp-1787563400000-xyz',
      createdAt: '2026-08-24T10:00:05Z',
    };
    const persisted = {
      id: '123456789012345678',
      createdAt: '2026-08-24T10:00:00Z',
    };

    expect(() => compareMessageOrder(optimistic1, persisted)).not.toThrow();
    expect(compareMessageOrder(persisted, optimistic1)).toBeLessThan(0);
    expect(compareMessageOrder(optimistic1, optimistic2)).toBeLessThan(0);
  });

  it('xử lý an toàn timestamp không hợp lệ hoặc thiếu', () => {
    const invalidTimeMsg = { id: 'temp-1', createdAt: 'invalid-date' };
    const validTimeMsg = { id: 'temp-2', createdAt: '2026-08-24T10:00:00Z' };

    expect(() => compareMessageOrder(invalidTimeMsg, validTimeMsg)).not.toThrow();
  });

  it('fallback theo optimisticSeq và clientNonce khi timestamp trùng nhau', () => {
    const msgA = {
      id: 'temp-a',
      createdAt: '2026-08-24T10:00:00Z',
      optimisticSeq: 1,
      clientNonce: 'nonce-1',
    };
    const msgB = {
      id: 'temp-b',
      createdAt: '2026-08-24T10:00:00Z',
      optimisticSeq: 2,
      clientNonce: 'nonce-2',
    };

    expect(compareMessageOrder(msgA, msgB)).toBeLessThan(0);
    expect(compareMessageOrder(msgB, msgA)).toBeGreaterThan(0);
  });
});
